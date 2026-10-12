import type { APIRoute } from "astro";
import { buildFeed } from "../lib/feed";

export const GET: APIRoute = ({ site, url }) =>
	buildFeed(site ?? new URL(url.origin), ["essays","notes"], "Jon Litwack", "/rss.xml");
