# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Personal essays site for Jon Litwack at jonlitwack.com. Next.js, deployed on Vercel. Dark-only, minimalist design — essays are the entire site.

## Build & Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint
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

### Content
- Essays live in `content/essays/*.md` with YAML frontmatter (`title`, `date`, optional `summary`)
- Images go in `public/images/` and are referenced in Markdown as `![alt](/images/filename.jpg)`

### Publishing Workflow
1. Write essay in Markdown (with Claude, in an editor, or on GitHub mobile)
2. Save to `content/essays/slug-name.md` with frontmatter:
   ```yaml
   ---
   title: Essay Title
   date: 2026-03-22T00:00:00.000Z
   ---
   ```
3. Add any images to `public/images/`
4. Commit and push — Vercel auto-deploys in ~60 seconds

### Brand System
All design specs are in `jonlitwack-context.md`. Key tokens in `globals.css`:
- Colors: `--night` (bg), `--ice` (headlines), `--muted` (body), `--rule` (borders), `--cyan` (accent on `<em>` only)
- Fonts: Source Serif 4 (body/headings), IBM Plex Mono (meta/labels)
- No light mode, no gradients, no shadows, no decorative elements
- Cyan accent only on italic `<em>`, wordmark, and active states
