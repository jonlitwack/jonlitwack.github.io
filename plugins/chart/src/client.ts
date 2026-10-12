/**
 * Progressive enhancement for chart blocks.
 *
 * Replaces the server SVG with an Observable Plot chart that:
 * - resizes to its container (re-renders, so ticks and labels re-flow; no image scaling)
 * - has a crosshair + one tooltip listing every series at that x (bars: per-bar tooltip)
 * - works by keyboard (focus the chart, then ←/→, Home/End, Esc)
 * - lets the reader isolate or hide series from the key
 * - can show its data as a table
 *
 * Encoding matches the server render: per-series dash + marker shape, so nothing
 * depends on colour alone.
 */
import * as Plot from "@observablehq/plot";
import { DASHES, MARKERS, type ChartSpec } from "./render";

type State = { hidden: Set<string>; focus: string | null; idx: number | null };

const FONT = '"IBM Plex Mono", ui-monospace, monospace';
const css = (name: string, el: Element) => getComputedStyle(el).getPropertyValue(name).trim();

const fmt = (n: number) => String(Math.round(n * 10) / 10);

function symbolFor(shape: string, color: string, bg: string) {
	switch (shape) {
		case "circle":
			return { symbol: "circle", fill: color, stroke: color };
		case "ring":
			return { symbol: "circle", fill: bg, stroke: color };
		case "square":
			return { symbol: "square", fill: color, stroke: color };
		case "triangle":
			return { symbol: "triangle", fill: color, stroke: color };
		case "diamond":
			return { symbol: "diamond", fill: bg, stroke: color };
		case "cross":
			return { symbol: "times", fill: "none", stroke: color };
		case "bar":
			return { symbol: "plus", fill: "none", stroke: color };
		default:
			return { symbol: "wye", fill: "none", stroke: color };
	}
}

function swatch(color: string, dash: number[] | null | undefined, shape: string | null, bg: string, kind: "line" | "bar") {
	const ns = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(ns, "svg");
	svg.setAttribute("width", kind === "bar" ? "12" : "28");
	svg.setAttribute("height", "12");
	svg.setAttribute("aria-hidden", "true");
	if (kind === "bar") {
		const r = document.createElementNS(ns, "rect");
		Object.entries({ x: "1", y: "1", width: "10", height: "10", rx: "2", fill: color }).forEach(([k, v]) => r.setAttribute(k, v));
		svg.append(r);
		return svg;
	}
	const l = document.createElementNS(ns, "line");
	Object.entries({ x1: "1", x2: "27", y1: "6", y2: "6", stroke: color, "stroke-width": "2.5" }).forEach(([k, v]) => l.setAttribute(k, v));
	if (dash) l.setAttribute("stroke-dasharray", dash.join(" "));
	svg.append(l);
	if (shape) {
		const s = symbolFor(shape, color, bg);
		const c = document.createElementNS(ns, "circle");
		Object.entries({ cx: "14", cy: "6", r: "3", fill: s.fill === "none" ? bg : s.fill, stroke: color, "stroke-width": "1.6" }).forEach(([k, v]) =>
			c.setAttribute(k, v),
		);
		if (shape !== "circle" && shape !== "ring") {
			// Non-circle shapes: draw a small square/diamond hint so the key differs by form.
			c.remove();
			const p = document.createElementNS(ns, "path");
			const d: Record<string, string> = {
				square: "M11 3h6v6h-6z",
				triangle: "M14 2.5l3.6 6.5h-7.2z",
				diamond: "M14 2l4 4-4 4-4-4z",
				cross: "M11 3l6 6M17 3l-6 6",
				bar: "M10.5 6h7M14 2.5v7",
				chevron: "M11 4l3 3 3-3",
			};
			p.setAttribute("d", d[shape] ?? d.square);
			const filled = s.fill !== "none" && s.fill !== bg;
			p.setAttribute("fill", filled ? color : shape === "diamond" ? bg : "none");
			p.setAttribute("stroke", color);
			p.setAttribute("stroke-width", "1.6");
			svg.append(p);
		} else svg.append(c);
	}
	return svg;
}

function enhance(fig: HTMLElement) {
	if (fig.dataset.enhanced) return;
	fig.dataset.enhanced = "true";
	const spec: ChartSpec = JSON.parse(fig.dataset.chart!);
	const uid = fig.dataset.chartId!;
	const canvas = fig.querySelector<HTMLElement>(".chart-canvas")!;
	const type = spec.type === "bar" ? "bar" : "line";
	const n = Math.max(...spec.datasets.map((d) => d.data.length));
	const xLabels = spec.xLabels ?? Array.from({ length: n }, (_, i) => String(i));
	const xSuf = spec.xSuffix ?? "";
	const ySuf = spec.ySuffix ?? "";
	const values = spec.datasets.flatMap((d) => d.data.filter((v): v is number => typeof v === "number"));
	const yMin = spec.yMin ?? Math.min(0, ...values);
	const yMax = spec.yMax ?? Math.max(...values) * 1.08;
	const multi = spec.datasets.length > 1;
	const bg = css("--chart-bg", fig) || "#161a1f";
	const ink = css("--ice", fig) || "#e8f0ff";
	const muted = css("--muted", fig) || "#8a9098";

	const series = spec.datasets.map((ds, si) => ({
		label: ds.label ?? `Series ${si + 1}`,
		color: ds.color || ink,
		dash: ds.dash ?? (multi ? DASHES[si % DASHES.length] : null),
		shape: multi ? MARKERS[si % MARKERS.length] : null,
		width: ds.width ?? 2.5,
		fill: !!ds.fill,
		data: ds.data,
		colors: ds.colors,
	}));

	// Keep the server's data table; it becomes the "Show data" view.
	const tableWrap = canvas.querySelector<HTMLElement>(".sr-only");
	canvas.innerHTML = "";
	canvas.classList.add("is-live");

	const stage = document.createElement("div");
	stage.className = "chart-stage";
	stage.tabIndex = 0;
	stage.setAttribute("role", "group");
	stage.setAttribute(
		"aria-label",
		`${spec.title ?? "Chart"}. Interactive: use left and right arrow keys to step through ${type === "bar" ? "bars" : "points"}.`,
	);
	const host = document.createElement("div");
	const tip = document.createElement("div");
	tip.className = "chart-tip";
	tip.hidden = true;
	const live = document.createElement("div");
	live.className = "sr-only";
	live.setAttribute("aria-live", "polite");
	stage.append(host, tip, live);
	canvas.append(stage);

	const state: State = { hidden: new Set(), focus: null, idx: null };
	let plot: (SVGSVGElement | HTMLElement) & { scale?: (n: string) => any } = null as any;
	let lastWidth = 0;

	// ---------- key ----------
	let keyButtons: HTMLButtonElement[] = [];
	if (type === "line" && multi) {
		const key = document.createElement("div");
		key.className = "chart-key is-live";
		key.setAttribute("role", "group");
		key.setAttribute("aria-label", "Series. Select to show or hide.");
		for (const s of series) {
			const b = document.createElement("button");
			b.type = "button";
			b.className = "chart-key-item";
			b.setAttribute("aria-pressed", "true");
			b.append(swatch(s.color, s.dash, s.shape, bg, "line"));
			const t = document.createElement("span");
			t.textContent = s.label;
			b.append(t);
			b.addEventListener("click", () => {
				const visible = series.filter((x) => !state.hidden.has(x.label)).length;
				if (state.hidden.has(s.label)) state.hidden.delete(s.label);
				else if (visible > 1) state.hidden.add(s.label);
				b.setAttribute("aria-pressed", String(!state.hidden.has(s.label)));
				draw();
			});
			const on = () => {
				if (!state.hidden.has(s.label)) (state.focus = s.label), draw();
			};
			const off = () => {
				state.focus = null;
				draw();
			};
			b.addEventListener("pointerenter", on);
			b.addEventListener("pointerleave", off);
			b.addEventListener("focus", on);
			b.addEventListener("blur", off);
			key.append(b);
			keyButtons.push(b);
		}
		canvas.append(key);
	}

	// ---------- table toggle ----------
	const tableBtn = fig.querySelector<HTMLButtonElement>("[data-chart-table]");
	if (tableWrap && tableBtn) {
		tableBtn.hidden = false;
		const tableBox = document.createElement("div");
		tableBox.className = "chart-table";
		tableBox.hidden = true;
		tableBox.append(...Array.from(tableWrap.childNodes));
		canvas.append(tableBox);
		tableBtn.addEventListener("click", () => {
			tableBox.hidden = !tableBox.hidden;
			tableBtn.setAttribute("aria-expanded", String(!tableBox.hidden));
			tableBtn.textContent = tableBox.hidden ? "Show data" : "Hide data";
		});
	}

	// ---------- render ----------
	function draw() {
		const width = Math.max(260, Math.floor(stage.clientWidth));
		lastWidth = width;
		const narrow = width < 520;
		const height = Math.round(Math.max(200, (spec.height ?? 260) * (narrow ? 0.85 : 1)));
		const visible = series.filter((s) => !state.hidden.has(s.label));
		const longest = Math.max(...visible.map((s) => s.label.length));
		const marginRight = type === "line" && multi && !narrow ? Math.min(200, 26 + longest * 6.8) : 18;
		const marginLeft = 46;
		const plotW = width - marginLeft - marginRight;
		const maxLab = Math.max(...xLabels.map((l) => (l + xSuf).length));
		const marks: Plot.Markish[] = [];

		let x: Plot.ScaleOptions;
		if (type === "bar") {
			x = { type: "band", domain: xLabels, padding: 0.3, tickFormat: (l: string) => l + xSuf, label: null };
			const s = series[0];
			const rows = xLabels.map((l, i) => ({ l, i, v: s.data[i] ?? null, c: s.colors?.[i] || s.color }));
			const counts = new Map<string, number>();
			rows.forEach((r) => counts.set(r.c, (counts.get(r.c) ?? 0) + 1));
			const common = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
			marks.push(Plot.barY(rows, { x: "l", y: "v", fill: (d: any) => d.c, rx: 2 }));
			marks.push(
				Plot.barY(
					rows.filter((r) => r.c !== common),
					{ x: "l", y: "v", fill: `url(#${uid}-hatch)`, fillOpacity: 0.55, rx: 2 },
				),
			);
			if (!narrow || n <= 8)
				marks.push(
					Plot.text(rows, {
						x: "l",
						y: "v",
						text: (d: any) => (d.v == null ? "" : fmt(d.v) + ySuf),
						dy: -8,
						fill: ink,
						fontSize: 10.5,
						fontFamily: FONT,
					}),
				);
			if (state.idx != null)
				marks.push(Plot.barY([rows[state.idx]], { x: "l", y: "v", fill: "none", stroke: ink, strokeWidth: 1.5, rx: 2 }));
		} else {
			const count = Math.max(2, Math.floor(plotW / (maxLab * 7 + 16)));
			const step = Math.max(1, Math.ceil((n - 1) / (count - 1)));
			const ticks: number[] = [];
			for (let i = 0; i < n; i += step) ticks.push(i);
			x = { type: "linear", domain: [0, Math.max(1, n - 1)], ticks, tickFormat: (i: number) => (xLabels[i] ?? "") + xSuf, label: null };

			// End labels: place at each series' last point, then nudge apart vertically.
			const innerH = height - 16 - 30;
			const ypx = (v: number) => 16 + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;
			const xpx = (i: number) => marginLeft + (plotW * i) / Math.max(1, n - 1);
			const ends = visible
				.map((s) => {
					let li = -1;
					s.data.forEach((v, i) => typeof v === "number" && (li = i));
					return li < 0 ? null : { s, i: li, v: s.data[li] as number, y: ypx(s.data[li] as number), dy: 0 };
				})
				.filter((e): e is NonNullable<typeof e> => !!e)
				.sort((a, b) => a.y - b.y);
			for (let k = 1; k < ends.length; k++) {
				for (let j = 0; j < k; j++) {
					const a = ends[j];
					const b = ends[k];
					if (Math.abs(xpx(a.i) - xpx(b.i)) < 150 && b.y + b.dy - (a.y + a.dy) < 14) b.dy = a.y + a.dy + 14 - b.y;
				}
			}
			const endBy = new Map(ends.map((e) => [e.s.label, e]));

			for (const s of visible) {
				const rows = s.data.map((v, i) => ({ i, v }));
				const op = state.focus && state.focus !== s.label ? 0.15 : 1;
				if (s.fill) marks.push(Plot.areaY(rows, { x: "i", y: "v", fill: s.color, fillOpacity: 0.1 * op }));
				marks.push(
					Plot.lineY(rows, {
						x: "i",
						y: "v",
						stroke: s.color,
						strokeWidth: s.width,
						strokeDasharray: s.dash ? s.dash.join(" ") : undefined,
						strokeOpacity: op,
						strokeLinecap: "round",
						strokeLinejoin: "round",
					}),
				);
				if (s.shape) {
					const pts = rows.filter((r) => r.v != null);
					const every = Math.max(1, Math.ceil(n / (narrow ? 5 : 7)));
					const sparse = pts.filter((r, k) => k === pts.length - 1 || r.i % every === 0);
					const sym = symbolFor(s.shape, s.color, bg);
					marks.push(Plot.dot(sparse, { x: "i", y: "v", r: 3.6, ...sym, strokeWidth: 1.6, fillOpacity: op, strokeOpacity: op }));
					if (!narrow) {
						const last = pts[pts.length - 1];
						const end = endBy.get(s.label);
						if (last)
							marks.push(
								Plot.text([last], {
									x: "i",
									y: "v",
									text: () => s.label,
									dx: 9,
									dy: end?.dy ?? 0,
									textAnchor: "start",
									fill: ink,
									fillOpacity: 0.85 * op,
									fontSize: 11,
									fontFamily: FONT,
								}),
							);
					}
				}
			}
			if (state.idx != null) {
				marks.push(Plot.ruleX([state.idx], { stroke: muted, strokeOpacity: 0.7 }));
				const at = visible
					.map((s) => ({ s, v: s.data[state.idx!] }))
					.filter((d): d is { s: (typeof series)[number]; v: number } => typeof d.v === "number");
				marks.push(
					Plot.dot(at, { x: () => state.idx, y: (d: any) => d.v, r: 5, fill: (d: any) => d.s.color, stroke: bg, strokeWidth: 2 }),
				);
			}
		}

		const next = Plot.plot({
			width,
			height,
			marginLeft,
			marginRight,
			marginTop: 16,
			marginBottom: 30,
			style: { background: "transparent", color: muted, fontFamily: FONT, fontSize: "11px", overflow: "visible" },
			x: x as any,
			y: { domain: [yMin, yMax], grid: true, ticks: 5, tickFormat: (v: number) => fmt(v) + ySuf, label: null },
			marks: [...marks],
		}) as any;

		// Hatch pattern for highlighted bars (survives greyscale).
		const svg: SVGSVGElement = next.tagName?.toLowerCase() === "svg" ? next : next.querySelector("svg");
		svg.insertAdjacentHTML(
			"afterbegin",
			`<defs><pattern id="${uid}-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${bg}" stroke-width="2.4"/></pattern></defs>`,
		);
		svg.querySelectorAll("[aria-label='y-grid'] line").forEach((l) => l.setAttribute("stroke-opacity", "0.08"));
		svg.setAttribute("aria-hidden", "true");

		if (plot) plot.replaceWith(next);
		else host.append(next);
		plot = next;
		showTip();
	}

	// ---------- pointer / keyboard ----------
	function idxAt(clientX: number): number | null {
		if (!plot?.scale) return null;
		const rect = (plot as Element).getBoundingClientRect();
		const px = clientX - rect.left;
		const xs = plot.scale("x");
		if (type === "bar") {
			let best = 0;
			let d = Infinity;
			xLabels.forEach((l, i) => {
				const c = xs.apply(l) + xs.bandwidth / 2;
				if (Math.abs(c - px) < d) (d = Math.abs(c - px)), (best = i);
			});
			return best;
		}
		return Math.max(0, Math.min(n - 1, Math.round(xs.invert(px))));
	}

	function showTip() {
		if (state.idx == null || !plot?.scale) {
			tip.hidden = true;
			return;
		}
		const i = state.idx;
		const xs = plot.scale("x");
		const px = type === "bar" ? xs.apply(xLabels[i]) + xs.bandwidth / 2 : xs.apply(i);
		tip.replaceChildren();
		const head = document.createElement("div");
		head.className = "chart-tip-head";
		head.textContent = xLabels[i] + xSuf;
		tip.append(head);
		const rows = (type === "bar" ? series.slice(0, 1) : series.filter((s) => !state.hidden.has(s.label)))
			.map((s) => ({ s, v: s.data[i] }))
			.filter((r) => typeof r.v === "number")
			.sort((a, b) => (b.v as number) - (a.v as number));
		const spoken: string[] = [];
		for (const r of rows) {
			const row = document.createElement("div");
			row.className = "chart-tip-row";
			const color = type === "bar" ? r.s.colors?.[i] || r.s.color : r.s.color;
			row.append(swatch(color, r.s.dash, null, bg, type));
			const val = document.createElement("strong");
			val.textContent = fmt(r.v as number) + ySuf;
			const lab = document.createElement("span");
			lab.textContent = r.s.label;
			row.append(val, lab);
			tip.append(row);
			spoken.push(`${r.s.label} ${fmt(r.v as number)}${ySuf}`);
		}
		if (!rows.length) {
			const none = document.createElement("div");
			none.className = "chart-tip-row";
			none.textContent = "No data";
			tip.append(none);
		}
		live.textContent = `${xLabels[i]}${xSuf}: ${spoken.join(", ") || "no data"}`;
		tip.hidden = false;
		const w = tip.offsetWidth;
		const sw = stage.clientWidth;
		const left = px + 14 + w > sw ? px - 14 - w : px + 14;
		tip.style.left = `${Math.max(0, left)}px`;
	}

	function setIdx(i: number | null) {
		if (i === state.idx) return;
		state.idx = i;
		draw();
	}

	stage.addEventListener("pointermove", (e) => setIdx(idxAt(e.clientX)));
	stage.addEventListener("pointerdown", (e) => setIdx(idxAt(e.clientX)));
	stage.addEventListener("pointerleave", (e) => {
		if (e.pointerType === "mouse") setIdx(null);
	});
	stage.addEventListener("keydown", (e) => {
		const cur = state.idx ?? -1;
		if (e.key === "ArrowRight") setIdx(Math.min(n - 1, cur + 1));
		else if (e.key === "ArrowLeft") setIdx(Math.max(0, cur < 0 ? n - 1 : cur - 1));
		else if (e.key === "Home") setIdx(0);
		else if (e.key === "End") setIdx(n - 1);
		else if (e.key === "Escape") setIdx(null);
		else return;
		e.preventDefault();
	});
	stage.addEventListener("blur", () => setIdx(null));

	new ResizeObserver(() => {
		if (Math.abs(stage.clientWidth - lastWidth) > 2) draw();
	}).observe(stage);

	draw();
}

export function enhanceCharts() {
	const run = () => document.querySelectorAll<HTMLElement>(".chart-block[data-chart]").forEach((f) => {
		try {
			enhance(f);
		} catch (err) {
			// The server SVG is still there; leave it.
			console.error("Chart enhancement failed", err);
		}
	});
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
	else run();
}
