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

/** An image field's value, as stored by EmDash. */
export interface MediaValue {
	src?: string;
	url?: string;
	alt?: string;
	width?: number;
	height?: number;
	meta?: { storageKey?: unknown };
}

/** Public URL for an image field: the storage's public URL when set, else the media route. */
export function mediaUrl(
	value: MediaValue | null | undefined,
	locals: { emdash?: { getPublicMediaUrl?: (key: string) => string } },
): string | undefined {
	if (!value) return undefined;
	const key = typeof value.meta?.storageKey === "string" ? value.meta.storageKey : undefined;
	return (key && locals.emdash?.getPublicMediaUrl?.(key)) || value.src || value.url;
}

export const xml = (s: string) =>
	s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
