/**
 * Chart block → ChartSpec.
 *
 * A chart block holds JSON in `json`. Two shapes are accepted:
 *
 * 1. Inline (the old ```chart format, unchanged):
 *    { type, title, xLabels, datasets: [{ label, color, data: [...] }], ... }
 *
 * 2. Dataset reference (new): the numbers live in a Datasets entry as CSV,
 *    so one table can feed many charts and updating it updates them all.
 *    { "dataset": "trust-arc", "x": "year", "y": "pct", "series": "category",
 *      "type": "line", "title": "...", "colors": { "Finance (internet)": "#c84b2a" } }
 *    Wide CSVs work too: omit "y"/"series" and every non-x column is a series.
 */
import type { ChartSpec, ChartDataset } from "./render";

export interface DatasetRef {
	dataset: string;
	x: string;
	y?: string;
	series?: string;
	type?: "line" | "bar";
	title?: string;
	source?: string;
	height?: number;
	xSuffix?: string;
	ySuffix?: string;
	yMin?: number;
	yMax?: number;
	hero?: boolean;
	/** Only draw these series (by label), in this order. */
	include?: string[];
	colors?: Record<string, string>;
	dash?: Record<string, number[]>;
	width?: Record<string, number>;
	fill?: Record<string, boolean>;
	/** Bar charts: colour per x value, e.g. { "2020": "#c84b2a" } */
	barColors?: Record<string, string>;
}

export type BlockJson = ChartSpec | DatasetRef;

export function readBlockJson(node: unknown): { json?: BlockJson; error?: string } {
	try {
		const n = node as Record<string, unknown>;
		const raw = typeof n?.json === "string" ? JSON.parse(n.json) : n;
		if (!raw || typeof raw !== "object") return { error: "Chart JSON is empty" };
		return { json: raw as BlockJson };
	} catch {
		return { error: "Chart JSON is invalid" };
	}
}

export const isRef = (j: BlockJson): j is DatasetRef => typeof (j as DatasetRef).dataset === "string";

/** Small RFC-4180-ish CSV parser (quoted fields, escaped quotes, CRLF). Returns raw rows, header first. */
export function parseCsvRows(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let q = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (q) {
			if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
			else if (c === '"') q = false;
			else field += c;
		} else if (c === '"') q = true;
		else if (c === ",") row.push(field), (field = "");
		else if (c === "\n" || c === "\r") {
			if (c === "\r" && text[i + 1] === "\n") i++;
			row.push(field), (field = "");
			if (row.some((v) => v !== "")) rows.push(row);
			row = [];
		} else field += c;
	}
	row.push(field);
	if (row.some((v) => v !== "")) rows.push(row);
	return rows;
}

/** CSV rows as objects keyed by the (trimmed) header. */
export function parseCsv(text: string): Record<string, string>[] {
	const [head, ...body] = parseCsvRows(text);
	if (!head) return [];
	const keys = head.map((h) => h.trim());
	return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

/** Rows back to CSV text. Quotes only the cells that need it. */
export function toCsv(rows: string[][]): string {
	const cell = (v: string) => (/[",\r\n]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v);
	return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}

/**
 * Best-guess chart reference for a bare CSV, for the editor preview.
 * Long format (x, a text column, one number column) → series from the text
 * column. Otherwise wide: first column is x, every other column is a series.
 */
export function guessRef(rows: Record<string, string>[]): DatasetRef | null {
	if (!rows.length) return null;
	const cols = Object.keys(rows[0]);
	if (cols.length < 2) return null;
	const [x, ...rest] = cols;
	const numeric = (c: string) => rows.every((r) => r[c] === "" || Number.isFinite(Number(r[c])));
	const text = rest.filter((c) => !numeric(c));
	const nums = rest.filter(numeric);
	if (text.length === 1 && nums.length === 1) return { dataset: "preview", x, series: text[0], y: nums[0] };
	if (!nums.length) return null;
	return { dataset: "preview", x, include: nums };
}

const num = (v: string | undefined) => (v === undefined || v === "" ? null : Number(v));

/** Turn a dataset reference + its CSV rows into the same spec the inline format uses. */
export function specFromDataset(ref: DatasetRef, rows: Record<string, string>[]): ChartSpec {
	if (!rows.length) throw new Error(`Dataset "${ref.dataset}" has no rows`);
	if (!(ref.x in rows[0])) throw new Error(`Dataset "${ref.dataset}" has no column "${ref.x}"`);

	let xLabels = [...new Set(rows.map((r) => r[ref.x]))];
	// Whole-number x (years, steps): fill missing values so time stays to scale.
	if (xLabels.every((l) => /^-?\d+$/.test(l))) {
		const nums = xLabels.map(Number);
		const lo = Math.min(...nums);
		const hi = Math.max(...nums);
		if (hi - lo < 5000) xLabels = Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i));
	}
	const index = new Map(xLabels.map((l, i) => [l, i]));
	const series = new Map<string, (number | null)[]>();

	if (ref.series && ref.y) {
		for (const r of rows) {
			const key = r[ref.series];
			if (!series.has(key)) series.set(key, Array(xLabels.length).fill(null));
			series.get(key)![index.get(r[ref.x])!] = num(r[ref.y]);
		}
	} else {
		const cols = ref.y ? [ref.y] : Object.keys(rows[0]).filter((k) => k !== ref.x);
		for (const col of cols) series.set(col, xLabels.map(() => null));
		for (const r of rows) for (const col of cols) series.get(col)![index.get(r[ref.x])!] = num(r[col]);
	}

	let entries = [...series.entries()];
	if (ref.include?.length) entries = ref.include.filter((l) => series.has(l)).map((l) => [l, series.get(l)!]);
	const datasets: ChartDataset[] = entries.map(([label, data]) => ({
		label,
		data,
		color: ref.colors?.[label],
		dash: ref.dash?.[label],
		width: ref.width?.[label],
		fill: ref.fill?.[label],
		...(ref.barColors ? { colors: xLabels.map((l) => ref.barColors![l] ?? ref.colors?.[label] ?? "") } : {}),
	}));

	return {
		type: ref.type ?? "line",
		title: ref.title,
		source: ref.source,
		height: ref.height,
		xLabels,
		xSuffix: ref.xSuffix,
		ySuffix: ref.ySuffix,
		yMin: ref.yMin,
		yMax: ref.yMax,
		hero: ref.hero,
		datasets,
	};
}
