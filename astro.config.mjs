// Local development runs on Node + SQLite. For Cloudflare (D1 + R2 + Workers),
// see astro.config.cloudflare.mjs and DEPLOY.md.
import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";
import { agentGuardPlugin } from "@jonlitwack/plugin-agent-guard";
import { chartPlugin } from "@jonlitwack/plugin-chart";

export default defineConfig({
	output: "server",
	site: "https://www.jonlitwack.com",
	adapter: node({ mode: "standalone" }),
	integrations: [
		react(),
		emdash({
			database: sqlite({ url: "file:./data.db" }),
			storage: local({
				directory: "./uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
			plugins: [agentGuardPlugin(), chartPlugin()],
		}),
	],
	devToolbar: { enabled: false },
});
