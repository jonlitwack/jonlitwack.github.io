/**
 * Chart block plugin.
 *
 * Adds a `chart` block to the Portable Text editor (type `/chart`).
 * The block stores the same JSON the old site used inside ```chart fences,
 * as a string in the `json` field, so the schema is unchanged:
 *
 *   type, title, source, height, xLabels, xSuffix, ySuffix, yMin, yMax,
 *   datasets[]{ label, color, width, dash, fill, data[], colors[] }
 *
 * Rendering lives in ./astro (server-rendered SVG, no client JS).
 *
 * Saves through MCP or REST can send rich text as Markdown, which EmDash turns
 * into Portable Text with a ```chart fence as a plain `code` block. The
 * beforeSave hook converts those into `chart` blocks, so a chart written as a
 * fence (the format the essays use) renders as a chart wherever it came from.
 */
import { ContentSaveRejectedError, definePlugin } from "emdash";
import type { PluginDescriptor } from "emdash";

export function chartPlugin(): PluginDescriptor {
	return {
		id: "jonlitwack-chart",
		version: "1.0.0",
		format: "native",
		entrypoint: "@jonlitwack/plugin-chart",
		componentsEntry: "@jonlitwack/plugin-chart/astro",
		adminEntry: "@jonlitwack/plugin-chart/admin",
		options: {},
	};
}

interface Block {
	_type?: unknown;
	_key?: unknown;
	language?: unknown;
	code?: unknown;
}

const isChartFence = (b: unknown): b is Block =>
	typeof b === "object" && b !== null && (b as Block)._type === "code" && (b as Block).language === "chart";

/** Replace ```chart code blocks in every Portable Text field. Returns undefined if nothing changed. */
function convertChartFences(content: Record<string, unknown>) {
	let changed = false;
	const out: Record<string, unknown> = { ...content };
	for (const [field, value] of Object.entries(content)) {
		if (!Array.isArray(value) || !value.some(isChartFence)) continue;
		out[field] = value.map((block) => {
			if (!isChartFence(block)) return block;
			const json = String(block.code ?? "");
			try {
				JSON.parse(json);
			} catch (err) {
				throw new ContentSaveRejectedError(`A chart in "${field}" isn't valid JSON: ${(err as Error).message}`);
			}
			changed = true;
			return { _type: "chart", _key: block._key, json };
		});
	}
	return changed ? out : undefined;
}

export function createPlugin() {
	return definePlugin({
		id: "jonlitwack-chart",
		version: "1.0.0",
		capabilities: ["content:write"],
		hooks: {
			"content:beforeSave": {
				errorPolicy: "abort",
				handler: async (event) => convertChartFences(event.content),
			},
		},
		admin: {
			// Field widget "dataset-csv" (admin.tsx): grid + live preview for Datasets.csv.
			entry: "@jonlitwack/plugin-chart/admin",
			portableTextBlocks: [
				{
					type: "chart",
					label: "Chart",
					icon: "code",
					category: "Media",
					description: "Interactive line or bar chart. Inline JSON, or point at a Dataset by slug",
					fields: [
						{
							type: "text_input",
							action_id: "json",
							label: "Chart JSON",
							multiline: true,
							placeholder:
								'{ "dataset": "trust-arc", "x": "year", "y": "pct", "series": "category", "title": "…" }',
						},
					],
				},
			],
		},
	});
}

export default createPlugin;
