# Spec: finish the EmDash rebuild of jonlitwack.com

The rebuild is on the `emdash` branch. Read `CLAUDE.md` first. This file lists **only what's left**, in order. Each section ends with what "done" means. Stop at every **Check in** and wait for Jon.

## Already done

- EmDash project (Astro 7, EmDash 1.x), Node config for local and Cloudflare config for production. Both build.
- Collections: Essays, Notes, Pages, Datasets (`seed/schema.json`).
- All ten essays imported from `content/essays/`, with the same `/essays/{slug}` URLs and the same lead images.
- `/about`, Notes index and pages, feeds for essays, notes and both combined.
- Design ported from the Next.js site, with self-hosted fonts.
- `chart` block plugin: server SVG plus an interactive Observable Plot layer. Datasets collection, dataset-referencing charts, `/data/{slug}.csv`.
- Sample notes in `content/notes/` are **placeholders** written for the prototype. All four are now `status: draft` (2026-10-12), so the setup wizard can't publish them. Delete them before launch if they're not wanted as examples.

## 1. Agent access for the OB1 pipeline (security core)

Do this against a local instance first, then staging.

- Create an EmDash user for the agent with the **Contributor** role. Jon's account is the only Admin.
- Issue a personal access token for it with `content:read` and `content:write` only.
- Write `scripts/test-agent-permissions.mjs`. It calls the MCP endpoint (`/_emdash/api/mcp`) with the agent token and asserts:
  - `content_create` in `notes` succeeds and lands as a draft.
  - `content_publish`, `content_update`, `content_schedule`, `content_unpublish`, `content_delete` and `content_permanent_delete` are all refused.
  - Every `schema_*`, `settings_*`, `menu_*`, `taxonomy_*` (write), `media_*` (write) and `site_*` tool is refused.
- **Notes-only restriction.** EmDash roles don't scope by collection, so a Contributor can create in `essays`, `pages` and `datasets` too. Propose an enforcement point: a `content:beforeSave` hook in a small native plugin that rejects creates by the agent user outside `notes`, or a wrapper service that is the only thing holding the token. Check the hook reference to confirm a hook can reject a write. The test must cover it.

**Done when** the test script passes against local and staging, and fails loudly if the role or token scope is ever widened.

**Check in** with the enforcement proposal before building it.

## 2–3. OB1 pipeline: parked (2026-10-12)

The sanitizer (step 2) and publish-time check (step 3) are parked. Notes are written by hand in the admin until Jon decides otherwise. Reasons:

- OB1 mixes client work and personal material, and client topics are among the most frequent. A denylist alone can't catch a capture that describes an engagement without naming it.
- The model-based traceability check is off the table: Jon only wants free models, so no paid model or billable API key is used.
- OB1 captures have no tag marking what's safe to publish.

If this comes back, start from an opt-in design: Jon tags a capture (e.g. `publish-candidate`) and only tagged captures are ever filed as drafts, then run the denylist on those. OB1 is a Supabase project with an Edge Function, so the sanitizer would be another Edge Function there, holding the agent token and denylist as Supabase secrets. The original requirements are in git history (`e8879f4:docs/SPEC.md`).

Step 1 is done and stays: the agent-guard plugin does nothing unless a user below Author exists. Staging tokens with only `content:read content:write` are issued by `scripts/setup-local-agent.mjs --staging`, which writes the token row directly instead of using the device flow (which also grants `media:write`).

## 4. Email capture: done (2026-10-12)

Built as our own native plugin (`plugins/subscribe`), not Bulletin or a forms plugin: those are sandboxed registry plugins (need the sandbox runner and Workers Paid), are v0.1–0.2 from single authors with no public source, and would hold the list. See the README's "Email signups" section. On staging, confirm the 5-per-hour rate limit triggers (it needs Cloudflare's trusted client IP).

## 5. Authoring improvements

- ~~Field widget for the Datasets `csv` field: editable grid plus live chart preview.~~ Done 2026-10-12 (`plugins/chart/src/admin.tsx`, widget `jonlitwack-chart:dataset-csv`). Chart blocks inside essays still show as a summary card in the editor; use Preview to see them.
- ~~Move lead images into the media library and switch `lead_image` to an `image` field.~~ Done 2026-10-12. `build-seed.mjs` emits `$media` references; `emdash seed` downloads them from the live site (`SEED_MEDIA_BASE` overrides), so seeding needs the live site up. `public/images/` stays so old image URLs keep working.
- Rewrite essay descriptions. They currently default to the first 160 characters. Flagged to Jon 2026-10-12: all ten essays use the fallback; none has a written description. Don't write them.

## 6. Cloudflare staging

- Jon runs `npx wrangler login`. Create the D1 database and R2 bucket named in `wrangler.jsonc`, and fill in the IDs.
- ~~Recommend Workers Paid ($5 USD/month).~~ Free plan for now, with both caches on; revisit if requests start failing on CPU.
- (Original note:) Recommend Workers Paid ($5 USD/month). The free plan's 10 ms CPU cap per request will fail some server-rendered pages. Turn on EmDash's object cache and Workers Cache (see the docs) to keep CPU low.
- **Seeding D1:** the documented path is the setup wizard with "include sample content": the seed is bundled into the build and applied in Workers-sized batches. Proven locally on an empty database (2026-10-12); still to prove on staging. Runbook in the README ("Staging on Cloudflare"). Staging config is ready: `env.staging` in `wrangler.jsonc`, `npm run deploy:staging`.
- Deploy to a staging subdomain. Check every essay URL against the live site, every chart at desktop and 390px, all three feeds, `/data/*.csv`, and the agent permission tests against staging.

Status 2026-10-12: deployed to https://jonlitwack-site-staging.jon-1f6.workers.dev, wizard run by Jon (10 essays, 4 draft notes, 1 dataset, 10 images). Checked: all ten essay URLs match the live site (title, text, lead image); every chart at 1280px and 390px, no horizontal scroll; `/rss.xml` and `/essays/rss.xml` list 10, `/notes/rss.xml` 0 (notes are drafts); `/data/trust-arc.csv` matches `content/`; `/subscribers.csv` 404s signed out; the subscribe rate limit returns 429 on the sixth signup in an hour (test rows deleted). The first request left a migration lock held (README runbook). CPU per request: mostly 3–11 ms, cold spikes up to 33 ms, so the free plan's 10 ms cap is marginal: Workers Paid stays the recommendation. Still to run: agent permission test (`setup-local-agent.mjs --staging`, Jon runs it). Jon chose the free plan for now (2026-10-12). Workers Cache and the KV object cache are on (`astro.config.cloudflare.mjs`): public pages, feeds and CSVs are served from the edge without running the Worker (verified `cf-cache-status: HIT`); 404s and admin routes bypass it. Still to confirm: publishing an edit in the staging admin shows on the cached page straight away (EmDash purges by tag).

**Check in** before anything touches the production domain.

## 7. Cutover

- A proxy Worker sends a small share of traffic to the new site and falls back to the old one on any 5xx. Increase it to 100% once stable.
- Move DNS from Vercel to Cloudflare only after cutover is stable.
- Keep the Vercel deployment of `main` live for at least two weeks as rollback.
- After cutover, the old `/write` editor on `main` stops being the way essays are published. Essays are written in the EmDash admin.

**Check in** before moving DNS.

## 8. Backups

- Content lives in D1, not git. Schedule backups per the EmDash docs.
- Add a scheduled export that writes every published essay and note back to `content/` as markdown and commits it, so git always holds a readable copy. The registry's GitHub Sync plugin may do this; evaluate it before writing your own.

## Out of scope

- Publishing anything automatically
- Comments
- A third-party newsletter service
- Content for the Speaking and Projects pages
