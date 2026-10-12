/**
 * Admin field widget for the Datasets `csv` field (widget "jonlitwack-chart:dataset-csv").
 *
 * An editable grid over the CSV text, plus a live preview drawn with the same
 * code the site uses: renderChartSvg (server SVG) upgraded by client.ts
 * (Observable Plot). The stored value is still plain CSV text, so removing the
 * widget falls back to the normal text editor with nothing lost.
 *
 * The preview guesses the shape (see guessRef in spec.ts). A chart block that
 * references the dataset can pick different columns; the preview is a check
 * on the numbers, not on any one chart.
 */
import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import "./chart.css";
import "./admin.css";
import { enhanceCharts } from "./client";
import { renderChartSvg } from "./render";
import { guessRef, parseCsv, parseCsvRows, specFromDataset, toCsv } from "./spec";

interface FieldWidgetProps {
	value: unknown;
	onChange: (value: unknown) => void;
	label: string;
	id: string;
	required?: boolean;
}

const EMPTY: string[][] = [["x", "value"], ["", ""]];

function rowsFrom(value: unknown): string[][] {
	const rows = typeof value === "string" ? parseCsvRows(value) : [];
	return rows.length ? pad(rows) : EMPTY.map((r) => [...r]);
}

/** Make every row as wide as the widest one. */
function pad(rows: string[][]): string[][] {
	const width = Math.max(...rows.map((r) => r.length));
	return rows.map((r) => [...r, ...Array(width - r.length).fill("")]);
}

function escapeHtml(s: string) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ChartPreview({ csv }: { csv: string }) {
	const ref = useRef<HTMLDivElement>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const timer = setTimeout(() => {
			const el = ref.current;
			if (!el) return;
			try {
				const rows = parseCsv(csv);
				const guess = guessRef(rows);
				if (!guess) throw new Error("Add a first column for x and at least one column of numbers.");
				const spec = specFromDataset(guess, rows);
				const uid = "dataset-preview";
				el.innerHTML =
					`<figure class="chart-block" data-chart="${escapeHtml(JSON.stringify(spec))}" data-chart-id="${uid}">` +
					`<div class="chart-canvas">${renderChartSvg(spec, uid)}</div>` +
					`<div class="chart-foot"><div class="chart-actions">` +
					`<button type="button" class="chart-action" data-chart-table aria-expanded="false" hidden>Show data</button>` +
					`</div></div></figure>`;
				enhanceCharts();
				setError(null);
			} catch (e) {
				el.innerHTML = "";
				setError((e as Error).message);
			}
		}, 250);
		return () => clearTimeout(timer);
	}, [csv]);

	return (
		<div className="dsw-preview">
			<div ref={ref} />
			{error && (
				<p className="chart-error" role="note">
					Preview: {error}
				</p>
			)}
		</div>
	);
}

function DatasetCsvField({ value, onChange, label, id }: FieldWidgetProps) {
	const [rows, setRows] = useState<string[][]>(() => rowsFrom(value));
	const [asText, setAsText] = useState(false);
	const lastEmitted = useRef<string | null>(null);

	// Reload when the value changes from outside (revision restore, another tab).
	useEffect(() => {
		if (typeof value === "string" && value !== lastEmitted.current) setRows(rowsFrom(value));
	}, [value]);

	const csv = toCsv(rows);
	const commit = (next: string[][]) => {
		const padded = pad(next);
		setRows(padded);
		const text = toCsv(padded);
		lastEmitted.current = text;
		onChange(text);
	};

	const setCell = (r: number, c: number, v: string) =>
		commit(rows.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row)));

	// Paste a block from a spreadsheet (tab- or comma-separated) starting at this cell.
	const onPaste = (r: number, c: number) => (e: ClipboardEvent<HTMLInputElement>) => {
		const text = e.clipboardData.getData("text/plain");
		if (!/[\t\n]/.test(text)) return;
		e.preventDefault();
		const block = text.includes("\t")
			? text.replace(/\r/g, "").split("\n").filter((l) => l !== "").map((l) => l.split("\t"))
			: parseCsvRows(text);
		const next = rows.map((row) => [...row]);
		block.forEach((line, i) => {
			const ri = r + i;
			while (next.length <= ri) next.push(Array(next[0].length).fill(""));
			line.forEach((v, j) => {
				const ci = c + j;
				for (const row of next) while (row.length <= ci) row.push("");
				next[ri][ci] = v.trim();
			});
		});
		commit(next);
	};

	const header = rows[0];
	const width = header.length;

	return (
		<div className="dsw" role="group" aria-labelledby={`${id}-label`}>
			<div className="dsw-head">
				<span id={`${id}-label`} className="dsw-label">
					{label}
				</span>
				<button type="button" className="dsw-btn" onClick={() => setAsText((t) => !t)} aria-pressed={asText}>
					{asText ? "Edit as grid" : "Edit as text"}
				</button>
			</div>

			{asText ? (
				<textarea
					id={id}
					className="dsw-text"
					spellCheck={false}
					rows={Math.min(24, rows.length + 2)}
					defaultValue={csv}
					onBlur={(e) => commit(rowsFrom(e.currentTarget.value))}
					aria-describedby={`${id}-hint`}
				/>
			) : (
				<div className="dsw-scroll">
					<table className="dsw-grid">
						<thead>
							<tr>
								<th scope="col" className="dsw-corner">
									<span className="dsw-sr">Row</span>
								</th>
								{header.map((name, c) => (
									<th scope="col" key={c}>
										<div className="dsw-colhead">
											<input
												id={c === 0 ? id : undefined}
												value={name}
												aria-label={`Column ${c + 1} name`}
												onChange={(e) => setCell(0, c, e.currentTarget.value)}
												onPaste={onPaste(0, c)}
											/>
											{width > 2 && (
												<button
													type="button"
													className="dsw-x"
													aria-label={`Delete column ${name || c + 1}`}
													onClick={() => commit(rows.map((row) => row.filter((_, ci) => ci !== c)))}
												>
													×
												</button>
											)}
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.slice(1).map((row, i) => {
								const r = i + 1;
								return (
									<tr key={r}>
										<th scope="row" className="dsw-rownum">
											<span>{r}</span>
											{rows.length > 2 && (
												<button
													type="button"
													className="dsw-x"
													aria-label={`Delete row ${r}`}
													onClick={() => commit(rows.filter((_, ri) => ri !== r))}
												>
													×
												</button>
											)}
										</th>
										{row.map((cell, c) => (
											<td key={c}>
												<input
													value={cell}
													inputMode={c === 0 ? undefined : "decimal"}
													aria-label={`Row ${r}, ${header[c] || `column ${c + 1}`}`}
													onChange={(e) => setCell(r, c, e.currentTarget.value)}
													onPaste={onPaste(r, c)}
												/>
											</td>
										))}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			<div className="dsw-actions">
				<button type="button" className="dsw-btn" onClick={() => commit([...rows, Array(width).fill("")])}>
					Add row
				</button>
				<button
					type="button"
					className="dsw-btn"
					onClick={() => commit(rows.map((row, ri) => [...row, ri === 0 ? `column ${width + 1}` : ""]))}
				>
					Add column
				</button>
				<span className="dsw-count">
					{rows.length - 1} rows × {width} columns
				</span>
			</div>
			<p id={`${id}-hint`} className="dsw-hint">
				First row is the header. Long format (x, series, value) or wide (x, then one column per series) both work.
				Paste straight from a spreadsheet into any cell.
			</p>

			<ChartPreview csv={csv} />
		</div>
	);
}

export const fields = {
	"dataset-csv": DatasetCsvField,
};
