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
 */
import { definePlugin } from "emdash";
import type { PluginDescriptor } from "emdash";

export function chartPlugin(): PluginDescriptor {
	return {
		id: "jonlitwack-chart",
		version: "1.0.0",
		format: "native",
		entrypoint: "@jonlitwack/plugin-chart",
		componentsEntry: "@jonlitwack/plugin-chart/astro",
		options: {},
	};
}

export function createPlugin() {
	return definePlugin({
		id: "jonlitwack-chart",
		version: "1.0.0",
		admin: {
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
