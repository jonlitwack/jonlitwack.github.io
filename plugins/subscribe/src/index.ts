/**
 * Subscribe plugin.
 *
 * Collects email signups from the form on the site and stores them in the
 * plugin's own storage (D1 in production, SQLite locally). It sends no email.
 * When sending starts, export the list (/subscribers.csv) and send each
 * address a one-time confirmation.
 *
 * - `subscribe`: public POST. Accepts a URL-encoded body so the form works
 *   without JavaScript (303 redirect to /subscribed); answers JSON when the
 *   request asks for it.
 * - `admin`: Block Kit page listing subscribers, with delete and CSV export.
 *
 * Spam: a honeypot field, and at most RATE_LIMIT signups per IP per hour.
 * Raw IPs are never stored, only a salted hash in KV.
 */
import { definePlugin, definePluginRoute, pluginResponse } from "emdash";
import type { PluginContext, PluginDescriptor } from "emdash";
import {
	COLLECTION,
	CONSENT_TEXT,
	CONSENT_VERSION,
	INDEXES,
	PLUGIN_ID,
	type Subscriber,
} from "./shared";

const VERSION = "1.0.0";
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/;
const PAGE_SIZE = 50;

type Outcome = "ok" | "invalid" | "limited" | "error";

export function subscribePlugin(): PluginDescriptor {
	return {
		id: PLUGIN_ID,
		version: VERSION,
		format: "native",
		entrypoint: "@jonlitwack/plugin-subscribe",
		options: {},
	};
}

function subscribers(ctx: PluginContext) {
	return ctx.storage[COLLECTION]!;
}

async function sha256(text: string) {
	const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** True if this IP has used up its signups for the current window. */
async function rateLimited(ctx: PluginContext, ip: string | null) {
	if (!ip) return false;
	let salt = await ctx.kv.get<string>("state:salt");
	if (!salt) {
		salt = crypto.randomUUID();
		await ctx.kv.set("state:salt", salt);
	}
	const key = `state:rate:${(await sha256(salt + ip)).slice(0, 32)}`;
	const now = Date.now();
	const entry = await ctx.kv.get<{ start: number; count: number }>(key);
	if (!entry || now - entry.start > RATE_WINDOW_MS) {
		await ctx.kv.set(key, { start: now, count: 1 });
		return false;
	}
	if (entry.count >= RATE_LIMIT) return true;
	await ctx.kv.set(key, { start: entry.start, count: entry.count + 1 });
	return false;
}

function cleanPage(value: string | null) {
	if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
	return value.slice(0, 200);
}

function respond(request: Request, outcome: Outcome) {
	const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
	if (wantsJson) {
		return pluginResponse({
			status: outcome === "ok" ? 200 : outcome === "limited" ? 429 : outcome === "invalid" ? 400 : 500,
			headers: { "Content-Type": "application/json" },
			body: { kind: "text", value: JSON.stringify({ ok: outcome === "ok", outcome }) },
		});
	}
	return pluginResponse({
		status: 303,
		headers: { Location: outcome === "ok" ? "/subscribed" : `/subscribed?error=${outcome}` },
	});
}

function formatDate(iso: string) {
	return iso.slice(0, 10);
}

async function renderAdmin(ctx: PluginContext, request: Request, cursor?: string, toast?: string) {
	const store = subscribers(ctx);
	const [total, page] = await Promise.all([
		store.count(),
		store.query({ orderBy: { createdAt: "desc" }, limit: PAGE_SIZE, cursor }),
	]);
	const csvUrl = new URL("/subscribers.csv", request.url).toString();
	return {
		blocks: [
			{ type: "header", text: "Subscribers" },
			{
				type: "context",
				text: "Collected by the form on the site. Nothing is emailed yet. Each signup keeps the consent wording shown at the time.",
			},
			{ type: "stats", items: [{ label: "Subscribers", value: total.toLocaleString("en-CA") }] },
			{
				type: "actions",
				elements: [
					{
						type: "link",
						label: "Export CSV",
						target: { kind: "external", url: csvUrl },
						appearance: "primary",
					},
				],
			},
			{
				type: "table",
				page_action_id: "page",
				empty_text: "No subscribers yet.",
				columns: [
					{ key: "email", label: "Email" },
					{ key: "date", label: "Signed up" },
					{ key: "page", label: "Page" },
					{ key: "action", label: "", format: "element" },
				],
				rows: page.items.map(({ id, data }) => {
					const s = data as Subscriber;
					return {
						email: s.email,
						date: formatDate(s.createdAt),
						page: s.page,
						action: {
							type: "button",
							label: "Delete",
							action_id: "delete",
							value: id,
							style: "danger",
							confirm: {
								title: "Delete subscriber?",
								text: `${s.email} will be removed from the list. This can't be undone.`,
								confirm: "Delete",
								deny: "Cancel",
							},
						},
					};
				}),
				...(page.hasMore && page.cursor ? { next_cursor: page.cursor } : {}),
			},
		],
		...(toast ? { toast: { message: toast, type: "success" } } : {}),
	};
}

export function createPlugin() {
	return definePlugin({
		id: PLUGIN_ID,
		version: VERSION,
		storage: {
			[COLLECTION]: { indexes: INDEXES },
		},
		routes: {
			subscribe: definePluginRoute({
				public: true,
				methods: ["POST"],
				request: { body: "text", maxBytes: 4096 },
				response: "raw",
				handler: async (ctx) => {
					try {
						const form = new URLSearchParams(ctx.input);
						// Honeypot: people never see this field. Pretend it worked.
						if (form.get("website")) return respond(ctx.request, "ok");

						const email = (form.get("email") ?? "").trim().toLowerCase();
						if (email.length > 254 || !EMAIL_RE.test(email)) return respond(ctx.request, "invalid");
						if (await rateLimited(ctx, ctx.requestMeta.ip)) return respond(ctx.request, "limited");

						// The email is the record ID, so a repeat signup is a no-op and
						// the response never reveals whether an address is already listed.
						const store = subscribers(ctx);
						if (!(await store.exists(email))) {
							const record: Subscriber = {
								email,
								createdAt: new Date().toISOString(),
								page: cleanPage(form.get("page")),
								consentText: CONSENT_TEXT,
								consentVersion: CONSENT_VERSION,
							};
							await store.put(email, record);
						}
						return respond(ctx.request, "ok");
					} catch (error) {
						ctx.log.error("Subscribe failed", { error: String(error) });
						return respond(ctx.request, "error");
					}
				},
			}),
			admin: {
				handler: async (ctx) => {
					const input = (ctx.input ?? {}) as {
						type?: string;
						action_id?: string;
						value?: unknown;
					};
					if (input.type === "block_action" && input.action_id === "delete" && typeof input.value === "string") {
						await subscribers(ctx).delete(input.value);
						return renderAdmin(ctx, ctx.request, undefined, "Subscriber deleted");
					}
					if (input.type === "block_action" && input.action_id === "page") {
						const value = input.value as { cursor?: string } | undefined;
						return renderAdmin(ctx, ctx.request, value?.cursor);
					}
					return renderAdmin(ctx, ctx.request);
				},
			},
		},
		admin: {
			pages: [{ path: "/subscribers", label: "Subscribers", icon: "mail" }],
		},
	});
}

export default createPlugin;
