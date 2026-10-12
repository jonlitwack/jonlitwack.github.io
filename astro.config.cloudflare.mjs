// Production config: Cloudflare Workers + D1 + R2.
// Build with: npm run build:cf   Deploy with: npm run deploy
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { agentGuardPlugin } from "@jonlitwack/plugin-agent-guard";
import { chartPlugin } from "@jonlitwack/plugin-chart";

export default defineConfig({
	output: "server",
	site: "https://www.jonlitwack.com",
	adapter: cloudflare(),
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [agentGuardPlugin(), chartPlugin()],
		}),
	],
	devToolbar: { enabled: false },
});
