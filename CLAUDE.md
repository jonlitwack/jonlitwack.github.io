# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Personal essays site for Jon Litwack at jonlitwack.com. Next.js, deployed on Vercel. Dark-only, minimalist design — essays are the entire site. Includes a mobile-friendly editor at `/write`.

## Build & Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint
```

## Architecture

**Next.js App Router** with static generation. Essays are Markdown files in `content/essays/` parsed at build time via `gray-matter` + `remark`.

### Route Structure
- `src/app/(site)/` — public site (has Header + Footer layout)
  - `page.tsx` — essay index
  - `essays/[slug]/page.tsx` — individual essay (SSG)
- `src/app/write/` — editor (standalone layout, no site chrome)
  - `page.tsx` — client-side editor with essay list, paste/import, and publishing
- `src/app/api/` — API routes
  - `auth/[...nextauth]/` — GitHub OAuth via NextAuth
  - `essays/` — list and save essays via GitHub API
  - `essays/[slug]/` — get single essay

### Key Files
- `src/lib/essays.ts` — reads Markdown from filesystem (used by public site at build time)
- `src/lib/github.ts` — reads/writes to GitHub repo via Octokit (used by editor API)
- `src/middleware.ts` — protects `/write` route (requires GitHub OAuth)
- `src/app/globals.css` — all styles (CSS custom properties)
- `src/components/Header.tsx` — wordmark: "Jon Litwack — *writing*"
- `src/components/Footer.tsx` — email + LinkedIn

### Content
- Essays live in `content/essays/*.md` with YAML frontmatter (`title`, `date`, optional `summary`)
- Images go in `public/images/` and are referenced in Markdown as `![alt](/images/filename.jpg)`

### Publishing Workflow
**From mobile (primary):** Open `jonlitwack.com/write` → sign in with GitHub → paste Markdown from Claude or write directly → hit Publish → live in ~60 seconds.

**From desktop:** Same as above, or edit files directly and `git push`.

### Editor (`/write`)
- GitHub OAuth login (restricted to `ALLOWED_USER` env var)
- Lists essays from repo via GitHub API
- Paste/import zone: paste Markdown from clipboard or browse for .md file
- Title auto-detection: frontmatter → filename → first H1
- Publish commits to `content/essays/` via GitHub API, triggers Vercel deploy

### Environment Variables (Vercel)
- `NEXTAUTH_SECRET` — session encryption
- `NEXTAUTH_URL` — production URL
- `GITHUB_ID` / `GITHUB_SECRET` — OAuth App credentials
- `GITHUB_TOKEN` — PAT with repo scope (for committing)
- `ALLOWED_USER` — GitHub username allowed to access `/write`

### Brand System
All design specs are in `jonlitwack-context.md`. Key tokens in `globals.css`:
- Colors: `--night` (bg), `--ice` (headlines), `--muted` (body), `--rule` (borders), `--cyan` (accent on `<em>` only)
- Fonts: Source Serif 4 (body/headings), IBM Plex Mono (meta/labels)
- No light mode, no gradients, no shadows, no decorative elements
- Cyan accent only on italic `<em>`, wordmark, and active states
