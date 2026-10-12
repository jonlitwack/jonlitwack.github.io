#!/usr/bin/env node
/**
 * Builds seed/seed.json from:
 *   - seed/schema.json         (collections, settings, menus — hand-edited)
 *   - content/essays/*.md       (essays, copied verbatim from jonlitwack.github.io)
 *   - content/about.md          (About page)
 *   - content/notes/*.md        (notes; optional)
 *
 * Markdown is converted to Portable Text with `marked`'s lexer. ```chart fences
 * become `chart` blocks that keep the original JSON untouched in `json`.
 *
 * Usage: node scripts/build-seed.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { Lexer } from "marked";

const root = new URL("..", import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), "utf8");

// ---------- frontmatter ----------
function frontmatter(src) {
	const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!m) return { data: {}, body: src };
	const data = {};
	for (const line of m[1].split("\n")) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (!kv) continue;
		let v = kv[2].trim();
		if (/^".*"$/.test(v)) v = JSON.parse(v);
		else if (/^'.*'$/.test(v)) v = v.slice(1, -1);
		data[kv[1]] = v;
	}
	return { data, body: src.slice(m[0].length) };
}

// ---------- markdown → Portable Text ----------
let keyN = 0;
const key = () => `k${(keyN++).toString(36)}`;
const warnings = [];

function spans(tokens, marks = [], markDefs) {
	const out = [];
	for (const t of tokens ?? []) {
		switch (t.type) {
			case "text":
				if (t.tokens?.length) out.push(...spans(t.tokens, marks, markDefs));
				else out.push({ _type: "span", _key: key(), text: decode(t.text), marks });
				break;
			case "escape":
				out.push({ _type: "span", _key: key(), text: t.text, marks });
				break;
			case "strong":
				out.push(...spans(t.tokens, [...marks, "strong"], markDefs));
				break;
			case "em":
				out.push(...spans(t.tokens, [...marks, "em"], markDefs));
				break;
			case "del":
				out.push(...spans(t.tokens, [...marks, "strike-through"], markDefs));
				break;
			case "codespan":
				out.push({ _type: "span", _key: key(), text: decode(t.text), marks: [...marks, "code"] });
				break;
			case "link": {
				const k = key();
				markDefs.push({ _key: k, _type: "link", href: t.href });
				out.push(...spans(t.tokens, [...marks, k], markDefs));
				break;
			}
			case "br":
				out.push({ _type: "span", _key: key(), text: "\n", marks });
				break;
			case "html":
				warnings.push(`inline html kept as text: ${t.raw.slice(0, 40)}`);
				out.push({ _type: "span", _key: key(), text: t.raw, marks });
				break;
			default:
				out.push({ _type: "span", _key: key(), text: decode(t.raw ?? ""), marks });
		}
	}
	return out;
}

function decode(s) {
	return s
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");
}

function textBlock(tokens, style = "normal", extra = {}) {
	const markDefs = [];
	const children = spans(tokens, [], markDefs);
	return { _type: "block", _key: key(), style, markDefs, children, ...extra };
}

function toPT(md) {
	const blocks = [];
	const walk = (tokens, ctx = {}) => {
		for (const t of tokens) {
			switch (t.type) {
				case "space":
					break;
				case "paragraph":
					blocks.push(textBlock(t.tokens, ctx.quote ? "blockquote" : "normal"));
					break;
				case "heading":
					blocks.push(textBlock(t.tokens, `h${Math.min(Math.max(t.depth, 2), 6)}`));
					break;
				case "hr":
					blocks.push({ _type: "break", _key: key(), style: "line" });
					break;
				case "blockquote":
					walk(t.tokens, { quote: true });
					break;
				case "list":
					for (const item of t.items) {
						const level = (ctx.level ?? 0) + 1;
						for (const it of item.tokens) {
							if (it.type === "text" || it.type === "paragraph") {
								blocks.push(
									textBlock(it.tokens ?? [{ type: "text", text: it.text }], "normal", {
										listItem: t.ordered ? "number" : "bullet",
										level,
									}),
								);
							} else if (it.type === "list") {
								walk([it], { ...ctx, level });
							}
						}
					}
					break;
				case "code":
					if (t.lang === "chart") {
						JSON.parse(t.text); // fail loudly on bad chart JSON
						blocks.push({ _type: "chart", _key: key(), json: t.text });
					} else {
						blocks.push({ _type: "code", _key: key(), code: t.text, language: t.lang || undefined });
					}
					break;
				case "table":
					warnings.push("table found: converted to text rows — check rendering");
					blocks.push(textBlock([{ type: "text", text: t.raw }]));
					break;
				case "html":
					warnings.push(`html block kept as text: ${t.raw.slice(0, 40)}`);
					blocks.push(textBlock([{ type: "text", text: t.raw.trim() }]));
					break;
				default:
					warnings.push(`unhandled token ${t.type}`);
			}
		}
	};
	walk(Lexer.lex(md, { gfm: true }));
	return blocks;
}

const plain = (pt) =>
	pt
		.filter((b) => b._type === "block")
		.map((b) => b.children.map((c) => c.text).join(""))
		.join(" ");

// Mirrors the live site: description = first 160 chars of the essay.
function describe(pt) {
	const t = plain(pt).replace(/\s+/g, " ").trim();
	if (t.length <= 160) return t;
	return t.slice(0, 157).replace(/\s+\S*$/, "") + "…";
}

const isoDate = (d) => new Date(d).toISOString();

// Lead images go into the media library. `emdash seed` downloads each `$media`
// URL and won't fetch from localhost, so they come from the live site, which
// serves the same files from public/images. Override with SEED_MEDIA_BASE.
const MEDIA_BASE = (process.env.SEED_MEDIA_BASE || "https://www.jonlitwack.com").replace(/\/$/, "");
const leadImage = (path) => {
	const file = path.split("/images/").pop();
	return { $media: { url: `${MEDIA_BASE}/images/${file}`, alt: "", filename: file } };
};

// ---------- build ----------
const schema = JSON.parse(read("seed/schema.json"));
const content = { essays: [], notes: [], pages: [], datasets: [] };

for (const f of readdirSync(join(root, "content/essays")).filter((f) => f.endsWith(".md")).sort()) {
	const { data, body } = frontmatter(read(`content/essays/${f}`));
	const slug = basename(f, ".md");
	const pt = toPT(body);
	const image = data.image ? leadImage(data.image) : undefined;
	content.essays.push({
		id: `essay-${slug}`,
		slug,
		status: "published",
		data: {
			title: data.title,
			date: isoDate(data.date),
			description: data.description || describe(pt),
			...(image ? { lead_image: image } : {}),
			body: pt,
		},
	});
}

const notesDir = join(root, "content/notes");
if (existsSync(notesDir)) {
	for (const f of readdirSync(notesDir).filter((f) => f.endsWith(".md")).sort()) {
		const { data, body } = frontmatter(read(`content/notes/${f}`));
		const slug = basename(f, ".md");
		content.notes.push({
			id: `note-${slug}`,
			slug,
			status: data.status || "published",
			data: {
				title: data.title,
				date: isoDate(data.date),
				claim: data.claim,
				...(data.source_context ? { source_context: data.source_context } : {}),
				...(data.promoted_to ? { promoted_to: `$ref:essay-${data.promoted_to}` } : {}),
				body: toPT(body),
			},
		});
	}
}

const dataDir = join(root, "content/datasets");
if (existsSync(dataDir)) {
	for (const f of readdirSync(dataDir).filter((f) => f.endsWith(".csv")).sort()) {
		const slug = basename(f, ".csv");
		const metaPath = join(dataDir, `${slug}.json`);
		const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : {};
		content.datasets.push({
			id: `dataset-${slug}`,
			slug,
			status: "published",
			data: {
				title: meta.title ?? slug,
				csv: read(`content/datasets/${f}`),
				...(meta.source ? { source: meta.source } : {}),
				...(meta.notes ? { notes: meta.notes } : {}),
			},
		});
	}
}

const about = frontmatter(read("content/about.md"));
content.pages.push({
	id: "page-about",
	slug: "about",
	status: "published",
	data: { title: "About", body: toPT(about.body) },
});
for (const [slug, title] of [
	["speaking", "Speaking"],
	["projects", "Projects"],
]) {
	content.pages.push({
		id: `page-${slug}`,
		slug,
		status: "draft",
		data: {
			title,
			body: [textBlock([{ type: "text", text: `${title} — draft, not yet written.` }])],
		},
	});
}

writeFileSync(join(root, "seed/seed.json"), JSON.stringify({ ...schema, content }, null, "\t") + "\n");

const charts = content.essays.reduce((n, e) => n + e.data.body.filter((b) => b._type === "chart").length, 0);
console.log(
	`seed/seed.json: ${content.essays.length} essays (${charts} charts), ${content.notes.length} notes, ${content.pages.length} pages, ${content.datasets.length} datasets`,
);
if (warnings.length) console.log("warnings:\n  " + [...new Set(warnings)].join("\n  "));
