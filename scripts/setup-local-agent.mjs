// Creates the OB1 pipeline's agent user and token in the LOCAL SQLite db only.
//
//   node scripts/setup-local-agent.mjs
//
// The agent is a Contributor with a `content:read content:write` token. The
// token is written to .env.agent.local (ignored by git) for
// scripts/test-agent-permissions.mjs to read. Re-running replaces the token.
//
// Staging and production don't use this script: there, Jon invites the agent
// user as a Contributor in the admin and the agent signs in with
// `emdash login` (device flow), which caps the token's scopes at the role.
import { existsSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { generatePrefixedToken } from "@emdash-cms/auth";

const DB_PATH = "data.db";
const AGENT_EMAIL = "ob1-agent@localhost";
const CONTRIBUTOR = 20;
const SCOPES = ["content:read", "content:write"];

if (!existsSync(DB_PATH)) {
	console.error(`No ${DB_PATH}. Run \`npx emdash seed seed/seed.json\` first.`);
	process.exit(1);
}

const db = new DatabaseSync(DB_PATH);

let user = db.prepare("SELECT id, role FROM users WHERE email = ?").get(AGENT_EMAIL);
if (!user) {
	const id = randomUUID();
	db.prepare(
		"INSERT INTO users (id, email, name, role, email_verified) VALUES (?, ?, ?, ?, 1)",
	).run(id, AGENT_EMAIL, "OB1 agent", CONTRIBUTOR);
	user = { id, role: CONTRIBUTOR };
	console.log(`Created Contributor ${AGENT_EMAIL}`);
} else if (user.role !== CONTRIBUTOR) {
	db.prepare("UPDATE users SET role = ? WHERE id = ?").run(CONTRIBUTOR, user.id);
	console.log(`Reset ${AGENT_EMAIL} to Contributor (was role ${user.role})`);
}

db.prepare("DELETE FROM _emdash_api_tokens WHERE user_id = ?").run(user.id);
const { raw, hash, prefix } = generatePrefixedToken("ec_pat_");
db.prepare(
	"INSERT INTO _emdash_api_tokens (id, name, token_hash, prefix, user_id, scopes) VALUES (?, ?, ?, ?, ?, ?)",
).run(randomUUID(), "ob1-agent (local)", hash, prefix, user.id, JSON.stringify(SCOPES));

writeFileSync(
	".env.agent.local",
	`EMDASH_URL=http://localhost:4321\nEMDASH_AGENT_TOKEN=${raw}\n`,
);
console.log(`Issued token ${prefix}… with ${SCOPES.join(", ")} → .env.agent.local`);
