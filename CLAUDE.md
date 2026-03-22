# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Personal essays site for Jon Litwack at jonlitwack.com. Next.js + Tina CMS, deployed on Vercel. Dark-only, minimalist design — essays are the entire site.

## Build & Dev Commands

```bash
npm install                           # Install dependencies
npm run dev                           # Dev server with Tina CMS at localhost:3000 (runs tinacms dev + next dev)
npm run build                         # Production build
npm run start                         # Serve production build locally
npm run lint                          # Run ESLint
npx next dev                          # Dev server without Tina CMS (essays still render, no /admin)
```

## Architecture

**Next.js App Router** with static generation. Essays are Markdown files in `content/essays/` parsed at build time via `gray-matter` + `remark`.

### Key Files
- `src/lib/essays.ts` — reads and parses essay Markdown files from `content/essays/`
- `src/app/page.tsx` — index page (essay list sorted by date)
- `src/app/essays/[slug]/page.tsx` — individual essay page (SSG via `generateStaticParams`)
- `src/app/layout.tsx` — root layout (fonts, header, footer)
- `src/app/globals.css` — all styles (CSS custom properties, no CSS modules)
- `src/components/Header.tsx` — wordmark: "Jon Litwack — *writing*"
- `src/components/Footer.tsx` — email + LinkedIn
- `tina/config.ts` — Tina CMS schema (essay collection)

### Content
- Essays live in `content/essays/*.md` with YAML frontmatter (`title`, `date`, optional `summary`)
- Tina CMS provides an admin UI at `/admin` for editing (requires Tina Cloud credentials in env vars)

### Brand System
All design specs are in `jonlitwack-context.md`. Key tokens in `globals.css`:
- Colors: `--night` (bg), `--ice` (headlines), `--muted` (body), `--rule` (borders), `--cyan` (accent on `<em>` only)
- Fonts: Source Serif 4 (body/headings), IBM Plex Mono (meta/labels)
- No light mode, no gradients, no shadows, no decorative elements
- Cyan accent only on italic `<em>`, wordmark, and active states

### Tina CMS
- Local dev: `npm run dev` starts Tina's local GraphQL server alongside Next.js
- Production: requires `NEXT_PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN` env vars (from app.tina.io)
- Pages read Markdown directly from filesystem — Tina is for the editing UI, not rendering
