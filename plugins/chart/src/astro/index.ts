import Chart from "./Chart.astro";

// Export name is required by EmDash: merged into <PortableText> automatically.
export const blockComponents = {
	chart: Chart,
};
