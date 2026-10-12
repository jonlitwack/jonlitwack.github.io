import type { PortableTextBlock } from "emdash";

export const monthYear = (d: Date | string | null | undefined, month: "short" | "long" = "short") =>
	d
		? new Date(d).toLocaleDateString("en-US", { year: "numeric", month, timeZone: "UTC" })
		: "";

export const dayMonth = (d: Date | string | null | undefined) =>
	d
		? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
		: "";

export function plainText(blocks: PortableTextBlock[] | undefined | null): string {
	return (blocks ?? [])
		.filter((b: any) => b._type === "block")
		.map((b: any) => (b.children ?? []).map((c: any) => c.text).join(""))
		.join("\n\n");
}

export function readingMinutes(blocks: PortableTextBlock[] | undefined | null): number {
	return Math.max(1, Math.round(plainText(blocks).split(/\s+/).filter(Boolean).length / 230));
}

export const sortByDate = <T extends { data: { date?: Date | string | null } }>(items: T[]) =>
	[...items].sort((a, b) => new Date(b.data.date ?? 0).getTime() - new Date(a.data.date ?? 0).getTime());

export const xml = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
