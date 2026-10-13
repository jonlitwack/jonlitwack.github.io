// Creates the OB1 pipeline's agent user and token in the local SQLite db, or
// in the staging D1 database with --staging. Never production.
//
//   node scripts/setup-local-agent.mjs             # local data.db → .env.agent.local
//   node scripts/setup-local-agent.mjs --staging   # staging D1 → .env.agent.staging
//
// The agent is a Contributor with a `content:read content:write` token. The
// token is written to the .env file (ignored by git) for
// scripts/test-agent-permissions.mjs to read. Re-running replaces the token.
//
// Writing the token row directly is how staging gets a token without
// `media:write`: the device flow (`emdash login`) grants every scope the role
// allows, and Contributors may upload media.
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { generatePrefixedToken } from "@emdash-cms/auth";

const STAGING = process.argv.includes("--staging");
const STAGING_DB = "jonlitwack-site-staging";
const STAGING_URL = "https://jonlitwack-site-staging.jon-1f6.workers.dev";
const DB_PATH = "data.db";
const AGENT_EMAIL = "ob1-agent@localhost";
const CONTRIBUTOR = 20;
const SCOPES = ["content:read", "content:write"];

// Values are generated here (UUIDs, hashes, fixed strings), never user input.
const lit = (v) => (typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
function sql(statement, params = []) {
	let i = 0;
	return statement.replace(/\?/g, () => lit(params[i++]));
}

let query;
let run;
if (STAGING) {
	const d1 = (command) => {
		const out = execFileSync(
			"npx",
			["wrangler", "d1", "execute", STAGING_DB, "--env", "staging", "--remote", "--json", "--command", command],
			{ encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
		);
		return JSON.parse(out)[0].results;
	};
	query = (s, p) => d1(sql(s, p))[0];
	run = (s, p) => d1(sql(s, p));
} else {
	if (!existsSync(DB_PATH)) {
		console.error(`No ${DB_PATH}. Run \`npx emdash seed seed/seed.json\` first.`);
		process.exit(1);
	}
	const { DatabaseSync } = await import("node:sqlite");
	const db = new DatabaseSync(DB_PATH);
	query = (s, p = []) => db.prepare(s).get(...p);
	run = (s, p = []) => db.prepare(s).run(...p);
}

let user = query("SELECT id, role FROM users WHERE email = ?", [AGENT_EMAIL]);
if (!user) {
	const id = randomUUID();
	run("INSERT INTO users (id, email, name, role, email_verified) VALUES (?, ?, ?, ?, 1)", [
		id,
		AGENT_EMAIL,
		"OB1 agent",
		CONTRIBUTOR,
	]);
	user = { id, role: CONTRIBUTOR };
	console.log(`Created Contributor ${AGENT_EMAIL}`);
} else if (user.role !== CONTRIBUTOR) {
	run("UPDATE users SET role = ? WHERE id = ?", [CONTRIBUTOR, user.id]);
	console.log(`Reset ${AGENT_EMAIL} to Contributor (was role ${user.role})`);
}

run("DELETE FROM _emdash_api_tokens WHERE user_id = ?", [user.id]);
const { raw, hash, prefix } = generatePrefixedToken("ec_pat_");
run("INSERT INTO _emdash_api_tokens (id, name, token_hash, prefix, user_id, scopes) VALUES (?, ?, ?, ?, ?, ?)", [
	randomUUID(),
	`ob1-agent (${STAGING ? "staging" : "local"})`,
	hash,
	prefix,
	user.id,
	JSON.stringify(SCOPES),
]);

const envFile = STAGING ? ".env.agent.staging" : ".env.agent.local";
const url = STAGING ? STAGING_URL : "http://localhost:4321";
writeFileSync(envFile, `EMDASH_URL=${url}\nEMDASH_AGENT_TOKEN=${raw}\n`);
console.log(`Issued token ${prefix}… with ${SCOPES.join(", ")} → ${envFile}`);
