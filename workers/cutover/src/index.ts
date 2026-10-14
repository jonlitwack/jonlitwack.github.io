/**
 * Cutover proxy for www.jonlitwack.com (spec step 7).
 *
 * Runs on the www route in front of the old Next.js site on Vercel and sends
 * a share of visitors to the new EmDash site (the `jonlitwack-site` Worker,
 * reached through the SITE service binding).
 *
 * - Paths only the old site has (/write, /api, /_next) always go to Vercel.
 * - Paths only the new site has (/_emdash, /_astro, notes, feeds, data CSVs)
 *   always go to EmDash.
 * - Pages both have (/, /about, /essays/*, /images/*) go by a cookie, so a
 *   visitor stays on one site. NEW_PERCENT sets the share for new visitors.
 * - Any 5xx or exception from the new site is answered by Vercel instead.
 *   If this Worker itself throws, Cloudflare passes the request to the
 *   origin (passThroughOnException), which is Vercel.
 *
 * "Old" means fetch(request): a subrequest to this route's own hostname skips
 * the Worker and goes to the origin in DNS, which is Vercel. On workers.dev
 * (testing) there is no origin, so OLD_ORIGIN names it instead.
 */

interface Env {
	SITE: Fetcher;
	NEW_PERCENT: string;
	OLD_ORIGIN?: string;
}

const COOKIE = "jl_site";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const ALWAYS_OLD = /^\/(?:_next|write|api)(?:\/|$)/;
const ALWAYS_NEW =
	/^\/(?:_emdash|_astro|_image|_server-islands|data|notes|subscribed)(?:\/|$)|^\/\.well-known\/oauth-|^\/(?:rss\.xml|essays\/rss\.xml|subscribers\.csv|sitemap\.xml|robots\.txt)$/;

type Site = "new" | "old";

function readCookie(request: Request): Site | undefined {
	const match = request.headers.get("Cookie")?.match(/(?:^|;\s*)jl_site=(new|old)\b/);
	return match?.[1] as Site | undefined;
}

function oldRequest(request: Request, env: Env): Request {
	if (!env.OLD_ORIGIN) return request;
	const url = new URL(request.url);
	const origin = new URL(env.OLD_ORIGIN);
	url.protocol = origin.protocol;
	url.host = origin.host;
	return new Request(url, request);
}

function tag(response: Response, site: Site, setCookie: boolean): Response {
	const out = new Response(response.body, response);
	out.headers.set("X-Site", site);
	if (setCookie) {
		out.headers.append(
			"Set-Cookie",
			`${COOKIE}=${site}; Path=/; Max-Age=${COOKIE_MAX_AGE}; Secure; HttpOnly; SameSite=Lax`,
		);
	}
	return out;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		ctx.passThroughOnException();
		const { pathname } = new URL(request.url);

		let site: Site;
		let setCookie = false;
		if (ALWAYS_OLD.test(pathname)) site = "old";
		else if (ALWAYS_NEW.test(pathname)) site = "new";
		else {
			const cookie = readCookie(request);
			if (cookie) site = cookie;
			else {
				const percent = Math.min(100, Math.max(0, Number(env.NEW_PERCENT) || 0));
				site = Math.random() * 100 < percent ? "new" : "old";
				setCookie = true;
			}
		}

		if (site === "old") return tag(await fetch(oldRequest(request, env)), "old", setCookie);

		// Keep a copy so a failed request can be replayed to Vercel.
		const replay = request.clone();
		try {
			const response = await env.SITE.fetch(request);
			if (response.status < 500 || ALWAYS_NEW.test(pathname)) return tag(response, "new", setCookie);
			console.error(`new site ${response.status} on ${pathname}; serving old`);
		} catch (err) {
			if (ALWAYS_NEW.test(pathname)) throw err;
			console.error(`new site threw on ${pathname}; serving old`, err);
		}
		// Don't pin the visitor to a site that just failed: no cookie on fallback.
		return tag(await fetch(oldRequest(replay, env)), "old", false);
	},
} satisfies ExportedHandler<Env>;
