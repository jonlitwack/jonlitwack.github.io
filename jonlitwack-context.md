# jonlitwack.com — Brand & Build Context

## The Project

A personal essays site for Jon Litwack. Simple, typographic, writing-first. No portfolio, no bio page, no marketing. The writing does the work.

**Live site:** https://jonlitwack.com  
**Repo:** https://github.com/jonlitwack/jonlitwack.github.io  
**Deployed on:** Vercel  
**Current state:** Jekyll-based site with an old theme. Replace entirely.

---

## The Idea

**Collaboration Through Code** — the belief that code is a shared medium, not a credential. The wall between the people who understand problems and the people who build solutions is coming down. More perspectives in the material makes better software.

This site is where that idea lives and grows. It's an essays site first. The writing is the brand.

---

## Target Stack

- **Next.js** — framework
- **Tina CMS** — Git-backed Markdown editor, free tier, publishing UI at `/admin`
- **Vercel** — deployment (already connected to repo)

Replace the Jekyll setup entirely. No Ruby, no Gemfile, no build complexity.

---

## Brand System

### Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Display / Essays | Source Serif 4 (serif) | 300, 400 | Variable |
| Display italic | Source Serif 4 italic | 300, 400 | Variable |
| Meta / Labels | IBM Plex Mono | 300, 400 | Small |

Google Fonts import:
```
https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300;1,8..60,400&family=IBM+Plex+Mono:wght@300;400&display=swap
```

**Why Source Serif 4:** Optical sizing (`opsz`) means it adjusts letterform details automatically at display vs body sizes. Used by The Atlantic for body copy. Warm, authoritative, reads well at length. The 300 weight at large sizes gives confident headlines without heaviness.

### Color Tokens

```css
--night:  #161a1f;   /* Background. Dark slate, not pure black */
--ice:    #e8f0ff;   /* Primary text. Cool white, headlines and titles */
--muted:  #8a9098;   /* Body copy, secondary text, dates */
--rule:   #22242a;   /* Borders, dividers, horizontal rules */
--cyan:   #00d4e8;   /* Accent. Blade Runner cyan. Used sparingly. */
```

### Usage Rules

- **Cyan** appears only on italic `<em>` elements, the wordmark italic, active states, and essay labels. Nowhere else.
- **Ice** is for headlines, titles, and index essay titles.
- **Muted** is for body copy, dates, footer text.
- **No gradients.** No shadows. No decorative elements.
- **Borders** use `--rule` at 1px solid only.
- The design constraint is the aesthetic. Dark, considered, one electric note.

### The vibe

Dark bar. Aged nicely. Not pretentious. One neon sign in the window. The writing is what you came for.

---

## Site Structure

```
/                   → Essay index (list of all essays, title + date)
/essays/[slug]      → Individual essay page
```

That's it. No about page, no contact page, no nav beyond the site name linking home.

### Index page pattern

- Header: `Jon Litwack — writing` (em italic in accent color)
- One-line intro in DM Mono, muted color
- Essay list: title left, date right, separated by 1px rule lines
- Footer: email · LinkedIn

### Essay page pattern

- Header: same site name, links home
- Essay title in Lora 500, ~1.55rem
- Date in DM Mono 300, muted
- 1px rule separator
- Body in Lora 400, 1rem, line-height 1.75, max-width 640px
- `← All essays` link back to index
- Same footer

---

## Content

### Essays (placeholder titles, add real content)

| Title | Date | Slug |
|---|---|---|
| Collaboration Through Code | March 2026 | collaboration-through-code |
| Code Is a Medium | March 2026 | code-is-a-medium |
| The Enterprise Designer | February 2026 | the-enterprise-designer |
| What Protogen Is | January 2026 | what-protogen-is |

### First essay — full draft

**Title:** Collaboration Through Code  
**Date:** March 2026

---

For a long time, code was a wall. You either spoke the language or you waited. And if you waited, you translated — your ideas into tickets, tickets into estimates, estimates into sprints, sprints into something that didn't quite match what you had in your head. The wall didn't just slow things down. It changed what got built.

I spent a lot of years on the design side of that wall. I understood the problem better than most people in the room, but I couldn't touch the solution. I could describe it, sketch it, argue for it — but then I had to hand it off and hope the translation held.

What's changed isn't that the wall is gone. It's that it's become optional.

I was in a room recently with a group of designers. Nobody would call themselves a developer. We opened VS Code, opened Claude Code, and started building. In an hour, people had made a Pokédex, a personal data management tool, a native mobile prototype. Real things. Things that worked. The absorption in the room was total — because they were finally touching the thing, not describing it.

That's what I mean by collaboration through code. Not that everyone should learn to code. Not that AI replaces engineers. But that code is becoming a shared medium — something you can work *in* together, the way musicians work in sound or architects work in space. And when more perspectives can touch the material, the material gets better.

---

The best products I've seen built in the last two years weren't built faster because the engineers got faster. They were built better because the distance between the person who understood the problem and the person shaping the solution collapsed. The domain expert was in the code. The designer was running the prototype. The product thinker was changing the logic directly, not filing a ticket.

There's a word for when a medium becomes accessible enough that non-specialists start working in it: *democratization*. But that word makes it sound like a policy. What actually happens is more interesting. When more kinds of people work in a medium, the medium itself changes. Jazz happened when brass instruments became cheap. Punk happened when three-chord progressions became teachable. The medium doesn't just reach more people — it goes somewhere new.

I think that's what's happening with code right now. And I think the people who are going to shape where it goes aren't just the engineers. They're the designers who finally get to build what they imagine. The operators who can finally fix the thing that's been annoying them for three years. The domain experts who can finally make the tool that only they knew was missing.

The wall is coming down. The question is what we build on the other side.

---

## Publishing Workflow (target state)

1. Jon writes with Claude in any chat window, in Markdown
2. Jon saves the Markdown
3. Jon opens Tina CMS at jonlitwack.com/admin
4. Jon pastes the Markdown, sets title and date, hits publish
5. Tina commits to GitHub, Vercel deploys, live in ~60 seconds

No terminal. No git commands. No HTML editing.

---

## Voice & Tone

- Direct. No jargon.
- Short sentences. No filler.
- First person, no corporate distance.
- Ideas land at the end of paragraphs, not the beginning.
- Italic *em* for emphasis — never bold.

---

## What Not to Build

- No hero section
- No movement branding or manifesto page
- No email signup
- No portfolio or case studies
- No dark mode
- No animations or decorative elements
- No nav menu beyond the site name
- Nothing that looks like a consultant's website
