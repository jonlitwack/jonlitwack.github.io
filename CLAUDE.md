# CLAUDE.md

Guidance for Claude Code in this repository. Read this before changing anything.

## What this is

jonlitwack.com, Jon Litwack's essays site, being rebuilt on [EmDash](https://docs.emdashcms.com) (an Astro-based CMS) to run on Cloudflare Workers + D1 + R2.

- `main` is the **live** Next.js site on Vercel. Don't touch it from this branch. It's the rollback.
- `emdash` (this branch) is the rebuild. Vercel deployments are disabled for it in `vercel.json`.
- The remaining work is in `docs/SPEC.md`. Do it in order, and stop at every "Check in" point.

`jonlitwack-context.md` is the original brand brief. Its typography, colour and voice sections still apply. Its "Target Stack" section is out of date: this branch replaces Next.js with EmDash.

## Commands

```bash
npm install
node scripts/build-seed.mjs        # content/ → seed/seed.json (run after editing content/ or seed/schema.json)
npm run dev                        # http://localhost:4321, admin at /_emdash/admin
npx emdash seed seed/seed.json     # load content into the local SQLite db (first run, or after rm data.db)
npm run build                      # Node build (local)
npm run build:cf                   # Cloudflare build
npm run deploy                     # build:cf + wrangler deploy (needs Jon's Cloudflare login)
```

Dev sign-in without a passkey: `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin`.

EmDash docs are an MCP server (`.mcp.json` → `https://docs.emdashcms.com/mcp`). EmDash reached 1.0 in September 2026, so check the docs rather than relying on memory. Its agent skills are in `.agents/skills/` (`building-emdash-site`, `creating-plugins`, `emdash-cli`).

## Layout

| Path | What |
|---|---|
| `content/essays/*.md` | Essays. The same files `main` publishes. Frontmatter: `title`, `date`, `image`. |
| `content/notes/*.md` | Notes. Frontmatter: `title`, `date`, `claim`, `source_context`, optional `promoted_to` (essay slug), optional `status: draft`. |
| `content/datasets/*.csv` (+ `.json` meta) | Chart data. Meta: `title`, `source`, `notes`, `colors`. |
| `content/about.md` | About page. |
| `seed/schema.json` | Collections, fields, settings, menu. **Edit this, never `seed/seed.json`** (generated). |
| `scripts/build-seed.mjs` | Markdown → Portable Text importer. ```` ```chart ```` fences become `chart` blocks. |
| `plugins/chart/` | Native EmDash plugin: `chart` block type (editor + renderer), chart styles (`chart.css`, imported by `site.css`), and the Datasets grid editor (`admin.tsx`). |
| `plugins/subscribe/` | Email signups: public subscribe route, admin Subscribers page. CSV export is `src/pages/subscribers.csv.ts`. |
| `plugins/agent-guard/` | Restricts users below Author to the `notes` collection. Tested by `scripts/test-agent-permissions.mjs`. |
| `src/layouts/Base.astro`, `src/pages/`, `src/styles/site.css` | The site. |
| `astro.config.mjs` | Local (Node + SQLite). `astro.config.cloudflare.mjs` + `wrangler.jsonc` + `src/worker.ts` are production. Keep both configs' `plugins` in sync. |

Collections: `essays`, `notes`, `pages`, `datasets`. Routes: `/`, `/essays/{slug}`, `/notes`, `/notes/{slug}`, `/{slug}` (pages), `/data/{slug}.csv`, `/rss.xml`, `/essays/rss.xml`, `/notes/rss.xml`.

**Every essay URL must keep working.** `/essays/{slug}` slugs come from the filenames in `content/essays/`.

## Design rules

The site is dark-only, with one 640px column. Tokens are in `src/styles/site.css`:
`--night #161a1f` (background), `--ice #e8f0ff` (headlines, links), `--muted #8a9098` (body), `--rule #22242a` (borders), `--cyan #00d4e8` (accent, used for emphasis and hover only).

- Source Serif 4 is the reading face and IBM Plex Mono is used for meta, labels and chrome. Both are self-hosted via `@fontsource`. Don't add Google Fonts calls to the site.
- `em` renders in cyan. That's the house style.
- Don't import the EmDash template's look (Inter, blue accent, three-column article layout, `/posts` routes). It was removed on purpose.
- Tables: max 4 columns, never a blank first column for markers, callouts go in italic text below the table.

## Charts: hard requirements

Jon is colourblind. These rules aren't preferences:

- **Never encode meaning in colour alone.** Every line series has its own dash pattern and marker shape (`DASHES` and `MARKERS` in `plugins/chart/src/render.ts`, shared by server and client). Highlighted bars get a hatch. Never rely on red/green pairs.
- Label series directly at their end point, in ink (`--ice`), not in the series colour. The key repeats line style + marker.
- Every chart keeps a data table (screen readers, plus the "Show data" toggle).
- Two layers: `render.ts` draws static SVG on the server (RSS, crawlers, no-JS), and `client.ts` replaces it in the browser with Observable Plot (resize, crosshair tooltip listing every series, ←/→/Home/End/Esc, key toggles). Change both together and keep them visually consistent.
- Chart JSON is either the inline format (the legacy ```` ```chart ```` schema, unchanged) or a dataset reference. See `plugins/chart/src/spec.ts`. Don't break the inline format: published essays use it.
- After any chart change, render every chart in `content/` at desktop and 390px widths and look at them. Check the Datasets editor preview too: it uses the same renderer, client and `chart.css`.

## Voice (for anything written as Jon)

Practitioner dispatch: first person, present tense, concrete over academic. No defensive framing, no invented vocabulary, no flowery language, no "not X, but Y" constructions. Don't frame analysis as counts ("three ways…"); name the things. Never edit the wording of Jon's essays.

## Security rules (the OB1 → site pipeline)

- The pipeline's agent signs in as a **Contributor** user. It can create drafts and nothing else. Never give it Author, Editor or Admin, and never a token with `admin`, `schema:*`, `settings:*` or `media:write`.
- Nothing is ever published automatically. Jon publishes by hand in the admin.
- **This repo is public.** Never commit the sanitizer denylist, client or employer names, engagement details, tokens, or `.env`. The denylist is loaded at runtime from a secret.
- Admin access in Claude sessions is for local and staging instances only, never production.

## Housekeeping

- `emdash-env.d.ts` is generated on dev start. Commit it when the schema changes.
- `data.db`, `uploads/`, `dist/`, `.wrangler/` and `.env` are local and ignored.
- Commit messages: short, imperative. Don't commit to `main`.
