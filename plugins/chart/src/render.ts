/**
 * Server-side SVG chart renderer.
 *
 * Accessibility rules (Jon is colourblind; these are hard requirements):
 * - Never rely on colour alone. Every line series gets its own dash pattern
 *   and marker shape, and is labelled directly at its last data point.
 * - A key below the chart repeats each series as a line-style + marker swatch.
 * - Highlighted bars (a per-bar colour that differs from the run) get a hatch
 *   pattern and a value label, so the emphasis survives greyscale.
 * - A visually hidden data table carries every value for screen readers.
 */

export interface ChartDataset {
	label?: string;
	color?: string;
	width?: number;
	dash?: number[];
	fill?: boolean;
	data: (number | null)[];
	colors?: string[];
}

export interface ChartSpec {
	type?: "line" | "bar";
	title?: string;
	source?: string;
	height?: number;
	xLabels?: string[];
	xSuffix?: string;
	ySuffix?: string;
	yMin?: number;
	yMax?: number;
	hero?: boolean;
	datasets: ChartDataset[];
}

const W = 640;
export const MARKERS = ["circle", "square", "triangle", "diamond", "cross", "ring", "bar", "chevron"] as const;
// Distinct dash patterns, applied to series that don't set their own.
export const DASHES: (number[] | null)[] = [null, [7, 4], [2, 4], [12, 4, 2, 4], [4, 4], [1, 3], [10, 3, 2, 3, 2, 3], [16, 5]];

const esc = (s: unknown) =>
	String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

const fmt = (n: number) => (Math.abs(n) >= 100 || Number.isInteger(n) ? String(Math.round(n * 10) / 10) : String(Math.round(n * 10) / 10));

/** Accepts the stored block (`{ json: "..." }`) or a plain spec object. */
export function parseChart(node: unknown): { spec?: ChartSpec; error?: string } {
	try {
		const n = node as Record<string, unknown>;
		const raw = typeof n?.json === "string" ? JSON.parse(n.json) : n;
		if (!raw || !Array.isArray((raw as ChartSpec).datasets) || !(raw as ChartSpec).datasets.length) {
			return { error: "Chart has no datasets" };
		}
		return { spec: raw as ChartSpec };
	} catch {
		return { error: "Chart JSON is invalid" };
	}
}

function niceTicks(min: number, max: number, count = 5): number[] {
	const span = max - min || 1;
	const raw = span / count;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? raw;
	const ticks: number[] = [];
	for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
	return ticks;
}

function marker(shape: string, x: number, y: number, r: number, color: string): string {
	const c = `stroke="${color}" stroke-width="1.6"`;
	switch (shape) {
		case "circle":
			return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" ${c}/>`;
		case "ring":
			return `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--chart-bg)" ${c}/>`;
		case "square":
			return `<rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" fill="${color}" ${c}/>`;
		case "triangle":
			return `<path d="M${x} ${y - r * 1.2}L${x + r * 1.1} ${y + r * 0.8}L${x - r * 1.1} ${y + r * 0.8}Z" fill="${color}" ${c}/>`;
		case "diamond":
			return `<path d="M${x} ${y - r * 1.3}L${x + r * 1.1} ${y}L${x} ${y + r * 1.3}L${x - r * 1.1} ${y}Z" fill="var(--chart-bg)" ${c}/>`;
		case "cross":
			return `<path d="M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}" fill="none" stroke="${color}" stroke-width="2"/>`;
		case "bar":
			return `<path d="M${x - r * 1.2} ${y}L${x + r * 1.2} ${y}M${x} ${y - r * 1.2}L${x} ${y + r * 1.2}" fill="none" stroke="${color}" stroke-width="2"/>`;
		default:
			return `<path d="M${x - r} ${y - r * 0.6}L${x} ${y + r * 0.6}L${x + r} ${y - r * 0.6}" fill="none" stroke="${color}" stroke-width="2"/>`;
	}
}

export function renderChartSvg(spec: ChartSpec, uid: string): string {
	const type = spec.type === "bar" ? "bar" : "line";
	const H = Math.max(180, spec.height ?? 260);
	const n = Math.max(...spec.datasets.map((d) => d.data.length));
	const xLabels = spec.xLabels ?? Array.from({ length: n }, (_, i) => String(i));
	const values = spec.datasets.flatMap((d) => d.data.filter((v): v is number => typeof v === "number"));
	const yMin = spec.yMin ?? Math.min(0, ...values);
	const yMax = spec.yMax ?? Math.max(...values) * 1.08;
	const ySuf = spec.ySuffix ?? "";
	const xSuf = spec.xSuffix ?? "";
	const multi = spec.datasets.length > 1;

	// Right margin holds the direct labels on line charts.
	const longest = Math.max(...spec.datasets.map((d) => (d.label ?? "").length));
	const m = {
		t: 14,
		r: type === "line" && multi ? Math.min(190, 24 + longest * 6.2) : 16,
		b: 30,
		l: 44,
	};
	const pw = W - m.l - m.r;
	const ph = H - m.t - m.b;
	const X = (i: number) =>
		type === "bar" ? m.l + (pw / n) * (i + 0.5) : m.l + (n <= 1 ? pw / 2 : (pw * i) / (n - 1));
	const Y = (v: number) => m.t + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;

	const out: string[] = [];
	out.push(`<defs><pattern id="${uid}-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="var(--chart-bg)" stroke-width="2.4"/></pattern></defs>`);

	// Grid + y axis
	for (const t of niceTicks(yMin, yMax)) {
		const y = Y(t);
		out.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}" class="chart-grid"/>`);
		out.push(`<text x="${m.l - 8}" y="${y + 3.5}" text-anchor="end" class="chart-tick">${esc(fmt(t) + ySuf)}</text>`);
	}
	// X labels, thinned to fit
	const maxLabels = Math.max(2, Math.floor(pw / (Math.max(...xLabels.map((l) => (l + xSuf).length)) * 6.6 + 10)));
	const every = Math.ceil(n / maxLabels);
	xLabels.forEach((l, i) => {
		if (i % every !== 0 && i !== n - 1) return;
		if (i === n - 1 && i % every !== 0 && (n - 1) % every < every * 0.6) return;
		out.push(`<text x="${X(i)}" y="${H - 9}" text-anchor="middle" class="chart-tick">${esc(l + xSuf)}</text>`);
	});

	if (type === "bar") {
		const ds = spec.datasets[0];
		const base = ds.color ?? "var(--chart-ink)";
		// The most common bar colour is the "normal" run; anything else is a highlight.
		const counts = new Map<string, number>();
		(ds.colors ?? []).forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
		const common = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
		const bw = (pw / n) * 0.62;
		ds.data.forEach((v, i) => {
			if (typeof v !== "number") return;
			const color = ds.colors?.[i] ?? base;
			const x = X(i) - bw / 2;
			const y = Y(v);
			const h = Y(Math.max(yMin, 0)) - y;
			out.push(`<rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="${esc(color)}" rx="1.5"/>`);
			if (common && color !== common) {
				out.push(`<rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="url(#${uid}-hatch)" opacity="0.55" rx="1.5"/>`);
			}
			out.push(`<text x="${X(i)}" y="${y - 6}" text-anchor="middle" class="chart-value">${esc(fmt(v) + ySuf)}</text>`);
		});
	} else {
		type Lbl = { y: number; x: number; text: string; color: string; shape: string };
		const labels: Lbl[] = [];
		spec.datasets.forEach((ds, si) => {
			const color = ds.color ?? "var(--chart-ink)";
			const dash = ds.dash ?? (multi ? DASHES[si % DASHES.length] : null);
			const shape = MARKERS[si % MARKERS.length];
			const w = ds.width ?? 2.5;
			// Split into runs at nulls (gaps stay gaps).
			const runs: [number, number][][] = [];
			let cur: [number, number][] = [];
			ds.data.forEach((v, i) => {
				if (typeof v === "number") cur.push([X(i), Y(v)]);
				else if (cur.length) (runs.push(cur), (cur = []));
			});
			if (cur.length) runs.push(cur);
			for (const run of runs) {
				const d = run.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
				if (ds.fill) {
					const base = Y(Math.max(yMin, 0));
					out.push(`<path d="${d}L${run[run.length - 1][0].toFixed(1)} ${base}L${run[0][0].toFixed(1)} ${base}Z" fill="${esc(color)}" opacity="0.1"/>`);
				}
				out.push(`<path d="${d}" fill="none" stroke="${esc(color)}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash.join(" ")}"` : ""}/>`);
			}
			// Sparse markers along the line so series separate even in greyscale.
			if (multi) {
				const pts = ds.data.map((v, i) => [i, v] as const).filter(([, v]) => typeof v === "number");
				const step = Math.max(1, Math.ceil(n / 7));
				pts.forEach(([i, v], k) => {
					if (k === pts.length - 1 || i % step === 0) out.push(marker(shape, X(i), Y(v as number), 3.4, esc(color)));
				});
				const last = pts[pts.length - 1];
				if (last && ds.label) labels.push({ x: X(last[0]), y: Y(last[1] as number), text: ds.label, color, shape });
			}
		});
		// Direct labels: right of each series' last point, nudged apart vertically.
		labels.sort((a, b) => a.y - b.y);
		for (let i = 1; i < labels.length; i++) {
			if (Math.abs(labels[i].x - labels[i - 1].x) < 120 && labels[i].y - labels[i - 1].y < 13) {
				labels[i].y = labels[i - 1].y + 13;
			}
		}
		for (const l of labels) {
			out.push(`<text x="${l.x + 9}" y="${l.y + 3.5}" class="chart-direct">${esc(l.text)}</text>`);
		}
	}

	const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-labelledby="${uid}-t" class="chart-svg"><title id="${uid}-t">${esc(spec.title ?? "Chart")}</title>${out.join("")}</svg>`;

	// Key: line-style + marker swatch per series (line charts with >1 series).
	let key = "";
	if (type === "line" && multi) {
		key =
			`<ul class="chart-key">` +
			spec.datasets
				.map((ds, si) => {
					const color = esc(ds.color ?? "var(--chart-ink)");
					const dash = ds.dash ?? DASHES[si % DASHES.length];
					return `<li><svg width="34" height="12" aria-hidden="true"><line x1="1" x2="33" y1="6" y2="6" stroke="${color}" stroke-width="${ds.width ?? 2.5}"${dash ? ` stroke-dasharray="${dash.join(" ")}"` : ""}/>${marker(MARKERS[si % MARKERS.length], 17, 6, 3.2, color)}</svg>${esc(ds.label)}</li>`;
				})
				.join("") +
			`</ul>`;
	}

	// Screen-reader data table.
	const table =
		`<div class="sr-only"><table><caption>${esc(spec.title ?? "Chart data")}</caption><thead><tr><th scope="col">${esc(xSuf.trim() || "Point")}</th>` +
		spec.datasets.map((d) => `<th scope="col">${esc(d.label ?? "Value")}</th>`).join("") +
		`</tr></thead><tbody>` +
		xLabels
			.map(
				(l, i) =>
					`<tr><th scope="row">${esc(l + xSuf)}</th>` +
					spec.datasets.map((d) => `<td>${typeof d.data[i] === "number" ? esc(d.data[i] + ySuf) : "—"}</td>`).join("") +
					`</tr>`,
			)
			.join("") +
		`</tbody></table></div>`;

	return svg + key + table;
}
