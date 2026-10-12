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

Limit: EmDash's editor shows plugin blocks as a summary card, so you see the chart via Preview, not inline in the editor.

## Not done yet (from the spec)

- **OB1 agent access**: create the Contributor user, issue a `content:read content:write` token, and run the permission tests (create succeeds on Notes; publish, update, schedule, delete, schema, settings, menu and taxonomy calls all refused).
- **Collection restriction**: EmDash roles don't scope by collection. A Contributor can create Essays too. Needs a hook or a wrapper.
- **Sanitizer**: OB1-side, fail-closed denylist + LLM traceability check, denylist kept out of the repo.
- **Email capture**: needs your decision (forms plugin vs a D1 route).
- **Lead images** are stored as URL strings pointing at `/public/images`. Move them into the media library (R2) when you migrate.
- **Descriptions** were empty in the source, so the importer uses the first 160 characters, the same rule the live site applies. Rewrite them in the admin.
- **Cutover**: staging subdomain, proxy Worker with fallback, DNS last.
- **Backups and git export** of published content.
