import type { APIRoute } from "astro";
import { buildFeed } from "../../lib/feed";

export const GET: APIRoute = ({ site, url }) =>
	buildFeed(site ?? new URL(url.origin), ["notes"], "Jon Litwack — Notes", "/notes/rss.xml");
