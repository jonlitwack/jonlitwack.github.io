// Production config: Cloudflare Workers + D1 + R2.
// Build with: npm run build:cf   Deploy with: npm run deploy
import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { d1, kvCache, r2 } from "@emdash-cms/cloudflare";
import { agentGuardPlugin } from "@jonlitwack/plugin-agent-guard";
import { chartPlugin } from "@jonlitwack/plugin-chart";
import { subscribePlugin } from "@jonlitwack/plugin-subscribe";

// Public pages are served from Cloudflare's edge cache (Workers Cache) without
// running the Worker. Content pages tag their responses (Astro.cache.set with
// EmDash's cacheHint), and EmDash purges those tags on publish, so maxAge only
// bounds how long an untagged change (settings, menus) can take to show.
// Feeds and dataset CSVs aren't tagged: they refresh within maxAge.
// Anything not listed here must send its own Cache-Control: Workers Cache
// stores a 200 or 404 without one for up to two hours.
const PAGE = { maxAge: 300, swr: 86400 };
const FEED = { maxAge: 300 };

export default defineConfig({
	output: "server",
	site: "https://www.jonlitwack.com",
	adapter: cloudflare(),
	cache: { provider: cacheCloudflare() },
	routeRules: {
		"/": PAGE,
		"/essays/[slug]": PAGE,
		"/notes": PAGE,
		"/notes/[slug]": PAGE,
		"/[slug]": PAGE,
		"/subscribed": PAGE,
		"/rss.xml": FEED,
		"/essays/rss.xml": FEED,
		"/notes/rss.xml": FEED,
		"/data/[slug].csv": FEED,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			objectCache: kvCache({ binding: "CACHE" }),
			plugins: [agentGuardPlugin(), chartPlugin(), subscribePlugin()],
		}),
	],
	devToolbar: { enabled: false },
});
