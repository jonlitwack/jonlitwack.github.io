// CSV export of the subscriber list, linked from the admin's Subscribers page.
// Admins only: anyone else gets a 404.
import type { APIRoute } from "astro";
import { PluginStorageRepository } from "emdash";
import { COLLECTION, INDEXES, PLUGIN_ID, type Subscriber } from "@jonlitwack/plugin-subscribe/shared";

export const prerender = false;

const ADMIN = 50;

function csvCell(value: string) {
	// Quote everything; neutralise spreadsheet formulas.
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return `"${safe.replace(/"/g, '""')}"`;
}

export const GET: APIRoute = async ({ locals }) => {
	const { user, emdash } = locals;
	if (!user || user.role < ADMIN || !emdash?.db) return new Response("Not found", { status: 404 });

	const store = new PluginStorageRepository<Subscriber>(emdash.db, PLUGIN_ID, COLLECTION, INDEXES);
	const lines = [["email", "signed_up", "page", "consent_version", "consent_text"].join(",")];
	let cursor: string | undefined;
	do {
		const page = await store.query({ orderBy: { createdAt: "asc" }, limit: 100, cursor });
		for (const { data } of page.items) {
			lines.push(
				[data.email, data.createdAt, data.page, data.consentVersion, data.consentText].map(csvCell).join(","),
			);
		}
		cursor = page.hasMore ? page.cursor : undefined;
	} while (cursor);

	const date = new Date().toISOString().slice(0, 10);
	return new Response(lines.join("\r\n") + "\r\n", {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="subscribers-${date}.csv"`,
			"Cache-Control": "private, no-store",
		},
	});
};
