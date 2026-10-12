// Checks that the OB1 pipeline's agent token can file note drafts and do
// nothing else. Run against local or staging, never production.
//
//   node --env-file=.env.agent.local scripts/test-agent-permissions.mjs
//
// Needs EMDASH_URL and EMDASH_AGENT_TOKEN. Exits non-zero on any failure.
//
// Each refusal is checked for its exact error code, not just "it failed":
//   INSUFFICIENT_SCOPE        the token lacks the scope. If one of these turns
//                             into anything else, the token was widened.
//   INSUFFICIENT_PERMISSIONS  the role is too low. If one of these succeeds,
//                             the role was widened.
//   SAVE_REJECTED             the agent-guard plugin blocked a non-notes save.
// A validation or not-found error is a failure: it means the call never
// reached the permission check, so the test proved nothing.
//
// Each run files one draft note (the agent can't delete it). Delete test
// drafts in the admin.

const URL_BASE = process.env.EMDASH_URL;
const TOKEN = process.env.EMDASH_AGENT_TOKEN;
if (!URL_BASE || !TOKEN) {
	console.error("Set EMDASH_URL and EMDASH_AGENT_TOKEN (see scripts/setup-local-agent.mjs).");
	process.exit(2);
}
if (/(^|\.)jonlitwack\.com$/.test(new URL(URL_BASE).hostname)) {
	console.error("Refusing to run against production.");
	process.exit(2);
}

const SCOPE = "INSUFFICIENT_SCOPE";
const ROLE = "INSUFFICIENT_PERMISSIONS";
const GUARD = "SAVE_REJECTED";
const RUN = Date.now().toString(36);
const NOW = new Date().toISOString();

let rpcId = 0;
async function call(name, args = {}) {
	const res = await fetch(`${URL_BASE}/_emdash/api/mcp`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${TOKEN}`,
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: ++rpcId,
			method: "tools/call",
			params: { name, arguments: args },
		}),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${text.slice(0, 200)}`);
	const line = text.split("\n").find((l) => l.startsWith("data: "));
	const msg = JSON.parse(line ? line.slice(6) : text);
	if (msg.error) return { ok: false, code: `JSONRPC_${msg.error.code}`, text: msg.error.message };
	const out = msg.result;
	const body = out.content?.map((c) => c.text).join("\n") ?? "";
	if (out.isError) return { ok: false, code: out._meta?.code ?? "UNKNOWN", text: body };
	let data;
	try {
		data = JSON.parse(body);
	} catch {
		data = body;
	}
	return { ok: true, data };
}

const failures = [];
let passed = 0;
function pass(label) {
	passed++;
	console.log(`  ok    ${label}`);
}
function fail(label, why) {
	failures.push(label);
	console.log(`  FAIL  ${label}\n        ${why}`);
}

async function expectRefused(label, tool, args, code) {
	const r = await call(tool, args);
	if (r.ok) return fail(label, `${tool} succeeded. It must be refused with ${code}.`);
	if (r.code !== code) return fail(label, `expected ${code}, got ${r.code}: ${r.text.slice(0, 160)}`);
	pass(label);
}

// ── Setup: things to aim the refusals at ──────────────────────────────────
console.log(`Agent permission test against ${URL_BASE}\n`);

const essays = await call("content_list", { collection: "essays", limit: 1 });
const essay = essays.ok ? (essays.data.items ?? essays.data)[0] : undefined;
if (!essay?.id) {
	console.error(`Can't list essays as the agent: ${essays.code ?? "no items"} ${essays.text ?? ""}`);
	process.exit(1);
}

// ── Allowed: a draft in notes ─────────────────────────────────────────────
console.log("Allowed");
const created = await call("content_create", {
	collection: "notes",
	slug: `agent-permission-test-${RUN}`,
	data: {
		title: `Agent permission test ${RUN}`,
		date: NOW,
		claim: "Test claim",
		source_context: "scripts/test-agent-permissions.mjs",
		body: "Filed by the permission test. Safe to delete.",
	},
});
const note = created.ok ? (created.data.item ?? created.data) : undefined;
if (!note?.id) {
	fail("content_create in notes", `${created.code}: ${created.text}`);
} else if (note.status !== "draft") {
	fail("content_create in notes lands as a draft", `status is "${note.status}"`);
} else {
	pass(`content_create in notes lands as a draft (${note.id})`);
}
const noteId = note?.id ?? "missing";
const noteRev = note?._rev ?? created.data?._rev ?? "missing";

// ── Refused: anything that changes or publishes content ───────────────────
console.log("\nRefused: content lifecycle");
const own = { collection: "notes", id: noteId };
const ownRev = { ...own, _rev: noteRev };
const theirs = { collection: "essays", id: essay.id };
await expectRefused("create as published", "content_create",
	{ collection: "notes", data: { title: `Published ${RUN}` }, status: "published" }, ROLE);
await expectRefused("content_update (own draft)", "content_update", { ...ownRev, data: { title: "x" } }, ROLE);
await expectRefused("content_update (essay)", "content_update", { ...theirs, _rev: "x", data: { title: "x" } }, ROLE);
await expectRefused("content_publish", "content_publish", ownRev, ROLE);
await expectRefused("content_schedule", "content_schedule", { ...ownRev, scheduledAt: "2099-01-01T00:00:00Z" }, ROLE);
await expectRefused("content_unpublish (essay)", "content_unpublish", { ...theirs, _rev: "x" }, ROLE);
await expectRefused("content_unschedule", "content_unschedule", own, ROLE);
await expectRefused("content_discard_draft", "content_discard_draft", ownRev, ROLE);
await expectRefused("content_delete (own draft)", "content_delete", own, ROLE);
await expectRefused("content_delete (essay)", "content_delete", theirs, ROLE);
await expectRefused("content_restore", "content_restore", own, ROLE);
await expectRefused("content_permanent_delete", "content_permanent_delete", own, ROLE);
await expectRefused("content_duplicate", "content_duplicate", theirs, ROLE);

// ── Refused: notes only ───────────────────────────────────────────────────
console.log("\nRefused: collections other than notes (agent-guard plugin)");
await expectRefused("content_create in essays", "content_create",
	{ collection: "essays", data: { title: `Essay ${RUN}`, date: NOW, description: "x" } }, GUARD);
await expectRefused("content_create in pages", "content_create",
	{ collection: "pages", data: { title: `Page ${RUN}` } }, GUARD);
await expectRefused("content_create in datasets", "content_create",
	{ collection: "datasets", data: { title: `Dataset ${RUN}`, csv: "a,b\n1,2" } }, GUARD);
{
	// The hook can't tell MCP from REST, so check REST takes the same path.
	const res = await fetch(`${URL_BASE}/_emdash/api/content/pages`, {
		method: "POST",
		headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
		body: JSON.stringify({ data: { title: `REST page ${RUN}` } }),
	});
	const body = await res.json().catch(() => ({}));
	if (body.error?.code === GUARD) pass("REST create in pages");
	else fail("REST create in pages", `expected ${GUARD}, got HTTP ${res.status} ${JSON.stringify(body).slice(0, 160)}`);
}

// ── Refused: everything outside content ───────────────────────────────────
// Expected codes are what EmDash 1.2 returns for a Contributor with a
// content:read + content:write token.
console.log("\nRefused: schema, settings, menus, taxonomies, media, site, bylines, revisions");
const OTHER = [
	["schema_list_collections", {}, SCOPE],
	["schema_get_collection", { slug: "notes" }, SCOPE],
	["schema_list_block_types", {}, SCOPE],
	["schema_get_block_type", { slug: "chart" }, SCOPE],
	["schema_create_collection", { slug: `x${RUN}`, label: "X" }, SCOPE],
	["schema_update_collection", { slug: "notes", label: "X" }, SCOPE],
	["schema_delete_collection", { slug: "notes" }, SCOPE],
	["schema_create_field", { collection: "notes", slug: `x${RUN}`, label: "X", type: "string" }, SCOPE],
	["schema_update_field", { collection: "notes", fieldSlug: "claim", label: "X" }, SCOPE],
	["schema_delete_field", { collection: "notes", fieldSlug: "claim" }, SCOPE],
	["schema_create_block_type", { slug: `x${RUN}`, label: "X", fields: [] }, SCOPE],
	["schema_update_block_type", { slug: "chart", expectedFingerprint: "x" }, SCOPE],
	["schema_activate_block_type_version", { slug: "chart", version: 1, expectedFingerprint: "x" }, SCOPE],
	["settings_get", {}, SCOPE],
	["settings_update", { title: "X" }, SCOPE],
	["menu_create", { name: `x${RUN}`, label: "X" }, ROLE],
	["menu_update", { name: "primary", label: "X" }, ROLE],
	["menu_delete", { name: "primary" }, ROLE],
	["menu_set_items", { name: "primary", items: [] }, ROLE],
	["taxonomy_create", { name: `x${RUN}`, label: "X" }, ROLE],
	["taxonomy_update", { name: "tags", label: "X" }, ROLE],
	["taxonomy_delete", { name: "tags" }, ROLE],
	["taxonomy_create_term", { taxonomy: "tags", label: "X" }, ROLE],
	["taxonomy_update_term", { taxonomy: "tags", termSlug: "x", label: "X" }, ROLE],
	["taxonomy_delete_term", { taxonomy: "tags", termSlug: "x" }, ROLE],
	// Contributors may upload media by role, so these prove the token scope.
	["media_upload", { filename: "x.png", base64: "iVBORw0KGgo=", contentType: "image/png" }, SCOPE],
	["media_create", { storageKey: "x" }, SCOPE],
	["media_update", { id: "x", alt: "X" }, SCOPE],
	["media_delete", { id: "x" }, SCOPE],
	["media_usage_repair", { scope: "all" }, SCOPE],
	["site_transfer_capabilities", {}, ROLE],
	["site_export_start", {}, ROLE],
	["site_export_status", { operationId: "x" }, ROLE],
	["site_import_analyze", { operationId: "x" }, ROLE],
	["site_import_start", { operationId: "x", packageDigest: `sha256:${"0".repeat(64)}`, planDigest: `sha256:${"0".repeat(64)}` }, ROLE],
	["site_import_status", { operationId: "x" }, ROLE],
	["site_import_resume", { operationId: "x" }, ROLE],
	["site_import_receipt", { operationId: "x" }, ROLE],
	["byline_create", { slug: `x${RUN}`, displayName: "X" }, ROLE],
	["byline_update", { id: "x", displayName: "X" }, ROLE],
	["byline_delete", { id: "x" }, ROLE],
	["revision_restore", { revisionId: "x" }, ROLE],
];
for (const [tool, args, code] of OTHER) await expectRefused(tool, tool, args, code);

// ── Result ────────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
	console.log("\nThe agent can do more than file note drafts. Don't run the pipeline until this passes.");
	process.exit(1);
}
