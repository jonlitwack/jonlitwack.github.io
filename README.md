# jonlitwack.com on EmDash (prototype)

A working rebuild of jonlitwack.com on [EmDash](https://docs.emdashcms.com) 1.x (Astro). All ten essays are imported from `jonlitwack/jonlitwack.github.io`, the charts are redrawn as accessible SVG, and there's a Notes feed under the essays.

## Run it

```bash
npm install
node scripts/build-seed.mjs          # rebuild seed/seed.json from content/
npx emdash secrets generate          # or set EMDASH_ENCRYPTION_KEY in .env
npm run dev                          # http://localhost:4321
npx emdash seed seed/seed.json       # in another terminal, first run only: loads essays + notes
```

Admin: http://localhost:4321/_emdash/admin. In dev, `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` signs you in without a passkey.

## What's here

| Path | What it is |
|---|---|
| `seed/schema.json` | Collections (Essays, Notes, Pages), settings, menu. Edit this, not `seed.json`. |
| `scripts/build-seed.mjs` | Markdown → Portable Text importer. ```` ```chart ```` fences become `chart` blocks with the JSON kept intact. |
| `content/` | Source content: essays (the same files the Next.js site used), About, notes, datasets (CSV). |
| `plugins/chart/` | Native EmDash plugin: `/chart` block in the editor, SVG renderer on the site. |
| `src/` | Layout, pages, feeds, styles (tokens ported from the old `globals.css`). |
| `astro.config.cloudflare.mjs`, `wrangler.jsonc`, `src/worker.ts` | Production target: Workers + D1 + R2. |

## Routes

| URL | Notes |
|---|---|
| `/` | Essays list, then latest notes |
| `/essays/{slug}` | Same slugs as the live site |
| `/notes`, `/notes/{slug}` | New |
| `/about` | Same URL as the live site |
| `/rss.xml`, `/essays/rss.xml`, `/notes/rss.xml` | Combined, essays, notes |

## Charts

The `chart` block (`plugins/chart`) renders in two layers:

1. **Server:** static SVG, so the chart is complete with no JavaScript, in RSS readers and for crawlers.
2. **Browser:** `client.ts` swaps in an Observable Plot chart that redraws to its width, with a crosshair tooltip listing every series, keyboard stepping (←/→, Home, End, Esc), a key that isolates or hides series, and a Show data table.

Every series gets its own dash pattern and marker shape, and labels sit in ink beside the marks, so nothing depends on colour.

A block's JSON is either the old inline format (unchanged) or a reference to a **Dataset** entry:

```json
{ "dataset": "trust-arc", "x": "year", "y": "pct", "series": "category",
  "title": "…", "ySuffix": "%", "include": ["Finance (internet)", "Finance (AI)"],
  "colors": { "Finance (internet)": "#c84b2a" } }
```

Datasets hold CSV (long or wide). Many charts can read one dataset, and editing it updates every chart with no rebuild. `/data/{slug}.csv` serves the raw numbers.

Editing a Dataset gives you a grid (paste straight from a spreadsheet, or switch to plain text) with a live preview drawn by the same code as the site. The preview guesses the shape: long (x, series, value) or wide (x, then a column per series). Chart blocks inside essays still show as a summary card in the editor, so check those with Preview.

## Email signups

The `subscribe` plugin (`plugins/subscribe`) adds a signup form (`src/components/Subscribe.astro`) to the home page, essay pages and note pages. Signups are stored in the site's own database. **Nothing is emailed yet.**

- Each signup keeps the email, date, page, and the consent wording shown at the time (`CONSENT_TEXT` in `plugins/subscribe/src/shared.ts`). Bump `CONSENT_VERSION` when the wording changes.
- Spam: a hidden honeypot field, and at most 5 signups per IP per hour. EmDash only trusts the client IP on Cloudflare, so the rate limit doesn't apply in local dev.
- The form works without JavaScript (redirects to `/subscribed`) and answers inline with it.
- Admin → **Subscribers** lists signups, deletes them, and links to `/subscribers.csv` (Admins only).

When sending starts: set up Cloudflare Email Sending, then send each address a one-time confirmation before adding it to anything.

## OB1 agent access

The pipeline's agent is a **Contributor** with a `content:read content:write` token. The role already stops it editing, deleting or publishing anything, including its own drafts, so each note has to be filed in one `content_create` call. The `agent-guard` plugin (`plugins/agent-guard`) adds the Notes-only restriction: a `content:beforeSave` hook rejects any save outside `notes` by a user below Author. It covers MCP and REST alike. Your Admin writes aren't affected.

Local:

```bash
node scripts/setup-local-agent.mjs        # Contributor user + token → .env.agent.local (ignored)
npm run dev
node --env-file=.env.agent.local scripts/test-agent-permissions.mjs
```

The test checks each refusal's exact error code, so it fails if the role or token is widened, not only if a call succeeds. Each run leaves one draft note behind; the agent can't delete it.

Staging: `node scripts/setup-local-agent.mjs --staging` writes the same user and token into the staging D1 database (via Wrangler) and saves them to `.env.agent.staging`; then run the test with `--env-file=.env.agent.staging`. Don't use `emdash login` for the agent: the device flow grants every scope the role allows, which includes `media:write`. The test refuses to run against jonlitwack.com.

Open question: `emdash login` uses the device flow, which caps scopes at the role. For a Contributor that still includes `media:write`, which the test rejects. Find out whether the device flow can request `content:read content:write` only before relying on it.

## Staging on Cloudflare

Staging is a separate Worker (`jonlitwack-site-staging`) with its own D1 database and R2 bucket, served on workers.dev. It never touches production data or DNS.

1. `npx wrangler login` (once).
2. `npm run deploy:staging`. The first deploy creates the D1 database and R2 bucket.
   Always use this script: the Astro adapter picks the environment at build time (`CLOUDFLARE_ENV=staging`), so `wrangler deploy --env staging` after a normal build would bind **production**.
3. Open the workers.dev URL Wrangler prints, then `/_emdash/admin`. The setup wizard runs: keep the title and tagline, tick **include sample content**, and create your admin passkey.
   This is how content gets into D1. The seed (`seed/seed.json`) is bundled into the build, and the wizard applies it in batches (five image downloads per request) so it fits Workers limits. Lead images download from the live site, so www.jonlitwack.com must be up. Tested locally on an empty database: 10 essays, 4 notes, 1 dataset, 10 images, in three requests.
   **If the admin says "Could not load dashboard data"** on a brand-new database: the first request runs all of EmDash's core migrations (90 in 1.2) and can be cut off partway, leaving a migration lock held. The Worker logs (`npx wrangler tail jonlitwack-site-staging`) show `MigrationLockHeldError` with the lock id. Check `_emdash_migrations` stops growing, release it with `npx wrangler d1 execute <db> --env <env> --remote --command "UPDATE _emdash_migrations_lock SET is_locked = 0 WHERE is_locked = <lock id>"`, and reload: the next request finishes the rest. Before production, run `emdash migrate` from CI instead (see the EmDash core migrations guide). Happened on staging 2026-10-12, stopping after 59 of 90.
4. The site URL comes from the request hostname. Set `EMDASH_SITE_URL` only if staging moves to a custom domain.

Caching: public routes are listed in `routeRules` in `astro.config.cloudflare.mjs` and served from Cloudflare's edge cache; EmDash purges tagged pages on publish. A new public route needs either a `routeRules` entry or its own `Cache-Control` header, because Workers Cache stores responses without one for up to two hours. The KV object cache (`CACHE` binding) caches query results underneath.

Fallback if the wizard path fails: `npx emdash site export` from a local instance and `site import` into staging (see the EmDash site transfer guide).

## Shipping from Claude Desktop

`skills/jonlitwack-publish/` is a Claude skill for filing essays and notes through the site's MCP endpoint, and publishing them when Jon says so.

1. Claude Desktop → Settings → Connectors → Add custom connector: URL `https://www.jonlitwack.com/_emdash/api/mcp` (staging's `/_emdash/api/mcp` until the cutover). Sign in with the passkey; on EmDash's permission screen keep only `content:read` and `content:write`.
2. `npm run skill:zip`, then upload `dist/jonlitwack-publish.zip` under Settings → Capabilities → Skills. Re-zip and re-upload after editing the skill.

The skill sends bodies as Portable Text, not Markdown: EmDash's Markdown converter drops `*italics*` and `---` dividers. After filing it reads the item back as Markdown and checks the wording matches. The chart plugin also turns a ```` ```chart ```` code block into a chart block on save, so fences survive the Markdown path too.

## Cutover to www.jonlitwack.com

jonlitwack.com's DNS is already on Cloudflare: `www` is a proxied record pointing at Vercel, and the apex redirects to `www` from Vercel. The cutover puts a proxy Worker (`workers/cutover`) on the `www` route, in front of Vercel:

- `/write`, `/api/*`, `/_next/*` (old site only) always go to Vercel.
- `/_emdash/*`, `/_astro/*`, notes, feeds, `/data/*` (new site only) always go to EmDash.
- Shared pages go by a `jl_site` cookie; `NEW_PERCENT` sets the share of new visitors. Responses carry `X-Site: new|old`.
- A 5xx or exception from EmDash is answered by Vercel instead.

The production Worker (`jonlitwack-site`) has no workers.dev URL; it's reached only through the proxy's service binding, so the admin passkey belongs to www.jonlitwack.com.

1. `npm run deploy`: production Worker, D1, R2 and KV (created on first deploy).
2. `npm run deploy:cutover`: the proxy at `NEW_PERCENT` 0. Visitors still see Vercel; `/_emdash` now reaches EmDash.
3. Straight away, open https://www.jonlitwack.com/_emdash/admin and run the setup wizard with **include sample content** (until it's done, anyone could claim the first admin). If it says "Could not load dashboard data", see the migration-lock note under staging.
4. Check the new site on the real domain by setting the cookie `jl_site=new` (or `curl -H 'Cookie: jl_site=new'`).
5. Raise `NEW_PERCENT` in `workers/cutover/wrangler.jsonc` (10 → 50 → 100) and `npm run deploy:cutover` each time. Lowering it to 0 is the rollback; visitors already pinned to `new` keep their cookie for up to a week, so for a hard rollback also change the cookie name.
6. Once at 100% and stable: point `www` straight at `jonlitwack-site` (custom domain), remove the proxy, keep Vercel live two weeks. **Check in with Jon before this step.**

`npm run deploy:cutover:test` deploys a copy on workers.dev in front of staging, with the live Vercel site as the old origin, for testing proxy changes.

During the canary, don't publish essays with the old `/write` editor: they'd only reach Vercel.

## Not done yet (from the spec)

- **Sanitizer**: OB1-side, fail-closed denylist + LLM traceability check, denylist kept out of the repo.
- **Lead image alt text** is empty (the source had none). Add it per essay in the admin.
- **Descriptions** were empty in the source, so the importer uses the first 160 characters, the same rule the live site applies. Rewrite them in the admin.
- **Cutover**: proxy Worker with fallback, DNS last. Staging is live at https://jonlitwack-site-staging.jon-1f6.workers.dev.
- **Backups and git export** of published content.
