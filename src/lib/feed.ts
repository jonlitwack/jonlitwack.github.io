import { getEmDashCollection } from "emdash";
import { plainText, xml } from "./content";

type Kind = "essays" | "notes";

export async function buildFeed(site: URL, kinds: Kind[], title: string, path: string): Promise<Response> {
	const items: { title: string; link: string; date: Date; summary: string; kind: Kind }[] = [];
	for (const kind of kinds) {
		const { entries } = await getEmDashCollection(kind, { status: "published", limit: 500 });
		for (const e of entries) {
			const d = e.data as Record<string, any>;
			items.push({
				kind,
				title: d.title,
				link: new URL(`/${kind}/${e.id}`, site).toString(),
				date: new Date(d.date ?? d.publishedAt ?? Date.now()),
				summary: kind === "essays" ? d.description : d.claim || plainText(d.body).slice(0, 280),
			});
		}
	}
	items.sort((a, b) => b.date.getTime() - a.date.getTime());

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xml(title)}</title>
<link>${site.toString()}</link>
<atom:link href="${new URL(path, site)}" rel="self" type="application/rss+xml"/>
<description>Essays and notes by Jon Litwack</description>
<language>en</language>
${items
	.map(
		(i) => `<item>
<title>${xml(i.title)}</title>
<link>${i.link}</link>
<guid isPermaLink="true">${i.link}</guid>
<pubDate>${i.date.toUTCString()}</pubDate>
<category>${i.kind === "essays" ? "Essay" : "Note"}</category>
<description>${xml(i.summary ?? "")}</description>
</item>`,
	)
	.join("\n")}
</channel>
</rss>`;
	return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
