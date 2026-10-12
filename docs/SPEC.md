# Spec: finish the EmDash rebuild of jonlitwack.com

The rebuild is on the `emdash` branch. Read `CLAUDE.md` first. This file lists **only what's left**, in order. Each section ends with what "done" means. Stop at every **Check in** and wait for Jon.

## Already done

- EmDash project (Astro 7, EmDash 1.x), Node config for local and Cloudflare config for production. Both build.
- Collections: Essays, Notes, Pages, Datasets (`seed/schema.json`).
- All ten essays imported from `content/essays/`, with the same `/essays/{slug}` URLs and the same lead images.
- `/about`, Notes index and pages, feeds for essays, notes and both combined.
- Design ported from the Next.js site, with self-hosted fonts.
- `chart` block plugin: server SVG plus an interactive Observable Plot layer. Datasets collection, dataset-referencing charts, `/data/{slug}.csv`.
- Sample notes in `content/notes/` are **placeholders** written for the prototype. Don't publish them to production. Delete them before launch, or keep them as `status: draft`.

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

Step 1 is done and stays: the agent-guard plugin does nothing unless a user below Author exists. Open item from step 1: find a way to issue a staging token with only `content:read content:write` (the device flow also grants `media:write`).

## 4. Email capture

Add a subscribe form to the home page, essay pages and note pages. Options:

- Store subscribers in D1 through a small route of our own.
- Use EmDash's forms plugin.
- Use the third-party Bulletin plugin (newsletters).

No third-party mailing service yet.

**Check in** with the options and a recommendation, then stop.

## 5. Authoring improvements

- The EmDash editor shows plugin blocks as a summary card, with no inline chart. Build a field widget (native plugin `adminEntry`, `fieldWidgets`) for the Datasets `csv` field: an editable grid plus a live chart preview using `client.ts`.
- Move lead images from URL strings (`/images/...`) into the media library (R2) and switch `lead_image` to an `image` field. Update `Base.astro` and the essay page together.
- Rewrite essay descriptions. They currently default to the first 160 characters. Flag them for Jon; don't write them.

## 6. Cloudflare staging

- Jon runs `npx wrangler login`. Create the D1 database and R2 bucket named in `wrangler.jsonc`, and fill in the IDs.
- Recommend Workers Paid ($5 USD/month). The free plan's 10 ms CPU cap per request will fail some server-rendered pages. Turn on EmDash's object cache and Workers Cache (see the docs) to keep CPU low.
- **Seeding D1 is untested.** `npx emdash seed` targets local SQLite. Find the documented path for loading `seed/seed.json` into D1 (site transfer, `emdash seed` against a remote, or the MCP), prove it on staging, and write it into the README.
- Deploy to a staging subdomain. Check every essay URL against the live site, every chart at desktop and 390px, all three feeds, `/data/*.csv`, and the agent permission tests against staging.

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
