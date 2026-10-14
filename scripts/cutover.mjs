// Cutover helper for www.jonlitwack.com (spec step 7). See the README's
// "Cutover to www.jonlitwack.com" for what each step does.
//
//   node scripts/cutover.mjs status          where things stand (read-only)
//   node scripts/cutover.mjs start           deploy site + proxy at 0%, wait for the wizard, check
//   node scripts/cutover.mjs check           compare new vs old on the real domain (read-only)
//   node scripts/cutover.mjs percent <n>     set the share of new visitors and deploy the proxy
//   node scripts/cutover.mjs release-lock    clear a stuck first-run migration lock
//
// Anything that changes production asks first. Pass --yes to skip the
// question (only when Jon has already said yes to that exact step).
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const WWW = "https://www.jonlitwack.com";
const PROD_DB = "jonlitwack-site";
const PROXY_CONFIG = "workers/cutover/wrangler.jsonc";
const YES = process.argv.includes("--yes");
const args = process.argv.slice(2).filter((a) => a !== "--yes");
const [cmd, arg] = args;

// ── helpers ───────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function confirm(question) {
	if (YES) return true;
	if (!process.stdin.isTTY) {
		console.error(`\n${question}\nNot a terminal, so I can't ask. Re-run with --yes once Jon has agreed.`);
		process.exit(2);
	}
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const answer = await rl.question(`\n${question} [y/N] `);
	rl.close();
	return /^y(es)?$/i.test(answer.trim());
}

function run(label, command, cmdArgs, opts = {}) {
	console.log(`\n▶ ${label}\n  $ ${command} ${cmdArgs.join(" ")}`);
	const r = spawnSync(command, cmdArgs, { stdio: "inherit", ...opts });
	if (r.status !== 0) {
		console.error(`\n✘ ${label} failed (exit ${r.status}). Stopping.`);
		process.exit(1);
	}
}

function d1(sql) {
	const out = execFileSync(
		"npx",
		["wrangler", "d1", "execute", PROD_DB, "--remote", "--json", "--command", sql],
		{ encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
	);
	return JSON.parse(out)[0].results;
}

async function get(path, site) {
	const headers = site ? { Cookie: `jl_site=${site}` } : {};
	const res = await fetch(WWW + path, { headers, redirect: "manual" });
	return { status: res.status, site: res.headers.get("x-site"), text: await res.text() };
}

function readPercent() {
	const m = readFileSync(PROXY_CONFIG, "utf8").match(/"production"[\s\S]*?"NEW_PERCENT":\s*"(\d+)"/);
	return m ? Number(m[1]) : undefined;
}

async function setupStatus() {
	try {
		const r = await get("/_emdash/api/setup/status");
		if (r.site !== "new") return { proxy: false };
		const body = JSON.parse(r.text);
		if (!body.success) return { proxy: true, error: body.error?.code ?? `HTTP ${r.status}` };
		return { proxy: true, needsSetup: body.data.needsSetup };
	} catch (e) {
		return { proxy: false, error: e.message };
	}
}

// ── commands ──────────────────────────────────────────────────────────────
async function status() {
	console.log(`Proxy NEW_PERCENT in ${PROXY_CONFIG}: ${readPercent()}% (what's deployed may differ)`);
	const s = await setupStatus();
	if (!s.proxy) console.log("Proxy: not on www yet (no X-Site header). Run `start`.");
	else if (s.error) console.log(`New site: error ${s.error}. NOT_CONFIGURED usually means a stuck migration lock: run \`release-lock\`.`);
	else console.log(`New site: ${s.needsSetup ? "waiting for the setup wizard" : "set up"}`);
	try {
		const [lock] = d1("SELECT is_locked FROM _emdash_migrations_lock");
		const [{ n }] = d1("SELECT count(*) AS n FROM _emdash_migrations");
		console.log(`Production D1: ${n} migrations applied, lock ${lock?.is_locked ? `HELD (${lock.is_locked})` : "free"}`);
	} catch {
		console.log("Production D1: not created yet (run `start`).");
	}
	let n = 0;
	for (let i = 0; i < 20; i++) if ((await get("/about")).site === "new") n++;
	if (s.proxy) console.log(`Sample of 20 new visitors to /about: ${n} got the new site`);
}

async function check() {
	const slugs = readdirSync("content/essays").filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
	const title = (h) => (h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]?.replace(/<[^>]+>|&#x?\w+;/g, "").trim();
	let bad = 0;
	const line = (ok, msg) => {
		if (!ok) bad++;
		console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
	};
	console.log(`Checking ${WWW} (new site forced with the jl_site cookie)\n`);
	for (const slug of [...slugs.map((s) => `/essays/${s}`), "/", "/about"]) {
		const [n, o] = await Promise.all([get(slug, "new"), get(slug, "old")]);
		line(n.status === 200 && n.site === "new" && o.status === 200 && title(n.text) === title(o.text),
			`${slug}  new ${n.status}/${n.site}  old ${o.status}/${o.site}  ${title(n.text) === title(o.text) ? "same title" : `titles differ: ${title(o.text)} | ${title(n.text)}`}`);
	}
	for (const p of ["/rss.xml", "/essays/rss.xml", "/notes/rss.xml", "/notes", "/data/trust-arc.csv"]) {
		const r = await get(p);
		line(r.status === 200 && r.site === "new", `${p}  ${r.status}/${r.site}`);
	}
	for (const p of ["/write", "/api/essays"]) {
		const r = await get(p, "new");
		line(r.site === "old", `${p} stays on Vercel  ${r.status}/${r.site}`);
	}
	const sub = await get("/subscribers.csv");
	line(sub.status === 404, `/subscribers.csv hidden when signed out  ${sub.status}`);
	console.log(bad ? `\n${bad} failed` : "\nAll checks passed");
	return bad === 0;
}

async function releaseLock() {
	const [lock] = d1("SELECT is_locked FROM _emdash_migrations_lock");
	if (!lock?.is_locked) return console.log("Lock is free. Nothing to do.");
	const count = () => d1("SELECT count(*) AS n FROM _emdash_migrations")[0].n;
	const before = count();
	console.log(`Lock ${lock.is_locked} held, ${before} migrations applied. Waiting 60s to make sure nothing is still running…`);
	await sleep(60_000);
	const after = count();
	if (after !== before) return console.log(`Still moving (${before} → ${after}). A migration is running: try again in a minute.`);
	if (!(await confirm(`Release migration lock ${lock.is_locked} on PRODUCTION D1 (${after} applied, no progress in 60s)?`))) return;
	d1(`UPDATE _emdash_migrations_lock SET is_locked = 0 WHERE is_locked = ${Number(lock.is_locked)}`);
	console.log("Released. Next request finishes the migrations:");
	const r = await get("/_emdash/api/setup/status");
	console.log(`  /_emdash/api/setup/status → ${r.status} ${r.text.slice(0, 120)}`);
}

async function percent(value) {
	const n = Number(value);
	if (!Number.isInteger(n) || n < 0 || n > 100) {
		console.error("Usage: node scripts/cutover.mjs percent <0-100>");
		process.exit(2);
	}
	const s = await setupStatus();
	if (n > 0 && (!s.proxy || s.error || s.needsSetup)) {
		console.error("The new site isn't set up on www yet. Run `start` and finish the wizard first.");
		process.exit(1);
	}
	if (n > 0 && !(await check())) {
		console.error("\nChecks failed, so I'm not raising the share.");
		process.exit(1);
	}
	const current = readPercent();
	if (!(await confirm(`Send ${n}% of new visitors to the new site (config says ${current}%)? This changes the live site.`))) return;
	const src = readFileSync(PROXY_CONFIG, "utf8");
	const next = src.replace(/("production"[\s\S]*?"NEW_PERCENT":\s*")\d+(")/, `$1${n}$2`);
	writeFileSync(PROXY_CONFIG, next);
	run("Deploy proxy", "npm", ["run", "deploy:cutover"]);
	console.log(`\nDone: ${n}%. Commit ${PROXY_CONFIG} so git matches what's live.${n === 0 ? "\nVisitors already pinned to the new site keep their cookie for up to a week; for a hard rollback, change COOKIE in workers/cutover/src/index.ts." : ""}`);
}

async function start() {
	const s = await setupStatus();
	if (s.proxy && s.needsSetup === false) {
		console.log("Already done: the proxy is on www and the new site is set up. Next: `percent 10`.");
		return;
	}
	if (!s.proxy) {
		if (!(await confirm("Deploy the production Worker (jonlitwack-site), then put the proxy on www.jonlitwack.com at 0%? Visitors keep seeing Vercel; /_emdash, notes and feeds start reaching EmDash.")))
			return;
		run("Deploy production site", "npm", ["run", "deploy"]);
		if (readPercent() !== 0) {
			console.error(`${PROXY_CONFIG} has NEW_PERCENT ${readPercent()}, not 0. Set it to 0 first.`);
			process.exit(1);
		}
		run("Deploy proxy at 0%", "npm", ["run", "deploy:cutover"]);
	}
	console.log(`\n→ Now open ${WWW}/_emdash/admin, tick "include sample content", and create your passkey.`);
	console.log("  Until that's done, anyone who finds the page could claim the first admin account.\n");
	for (let i = 0; ; i++) {
		const st = await setupStatus();
		if (st.error === "NOT_CONFIGURED" && i >= 6) {
			console.log("The new site has said NOT_CONFIGURED for a minute: probably a stuck migration lock.");
			await releaseLock();
		} else if (st.proxy && st.needsSetup === false) break;
		if (i % 6 === 0) console.log(`  waiting for the wizard… (${st.error ?? (st.needsSetup ? "needs setup" : "proxy not answering yet")})`);
		await sleep(10_000);
	}
	console.log("\nWizard done. Checking the new site on the real domain:\n");
	await check();
	console.log("\nNext, when you're ready: node scripts/cutover.mjs percent 10");
}

const commands = { status, start, check, percent: () => percent(arg), "release-lock": releaseLock };
if (!commands[cmd]) {
	console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(0, 11).join("\n").replace(/^\/\/ ?/gm, ""));
	process.exit(cmd ? 2 : 0);
}
await commands[cmd]();
