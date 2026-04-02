import { ChartJSNodeCanvas } from "chartjs-node-canvas";

interface ChartBlock {
  type: "line" | "bar";
  datasets: {
    label: string;
    data: (number | null)[];
    color: string;
    width?: number;
    dash?: number[];
    fill?: boolean;
  }[];
  title?: string;
  xLabels?: string[];
  xSuffix?: string;
  ySuffix?: string;
  yMin?: number;
  yMax?: number;
}

const WIDTH = 1200;
const HEIGHT = 630; // OG image standard ratio

/**
 * Extract the chart to use as the hero/OG image.
 * Prefers the chart with "hero": true, falls back to the first chart.
 */
export function extractHeroChart(body: string): ChartBlock | null {
  const regex = /```chart\n([\s\S]*?)\n```/g;
  const charts: ChartBlock[] = [];
  let match;
  while ((match = regex.exec(body)) !== null) {
    try {
      charts.push(JSON.parse(match[1]));
    } catch {
      // skip invalid JSON
    }
  }
  if (!charts.length) return null;
  return charts.find((c) => (c as ChartBlock & { hero?: boolean }).hero) ?? charts[0];
}

/**
 * Render a chart config to a PNG buffer for use as an OG image
 */
export async function renderChartToImage(config: ChartBlock): Promise<Buffer> {
  const canvas = new ChartJSNodeCanvas({
    width: WIDTH,
    height: HEIGHT,
    backgroundColour: "#161a1f",
  });

  const GRID = "rgba(255,255,255,0.06)";

  const chartConfig = {
    type: config.type as "line" | "bar",
    data: {
      labels: config.xLabels ?? config.datasets[0].data.map((_, i) => String(i)),
      datasets: config.datasets.map((ds) => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color,
        backgroundColor: ds.color + "1a",
        borderWidth: ds.width ?? 3,
        borderDash: ds.dash ?? [],
        fill: ds.fill ?? config.type === "bar",
        tension: 0.4,
        pointRadius: 0,
        spanGaps: false,
      })),
    },
    options: {
      responsive: false,
      animation: false as const,
      plugins: {
        legend: { display: false },
        title: config.title
          ? {
              display: true,
              text: config.title.toUpperCase(),
              color: "#8a9098",
              font: { size: 14, weight: "bold" as const, family: "sans-serif" },
              padding: { bottom: 20 },
            }
          : { display: false },
      },
      scales: {
        x: {
          grid: { color: GRID },
          border: { display: false },
          ticks: {
            color: "#666660",
            font: { size: 13, family: "sans-serif" },
            callback: (_: unknown, i: number) => {
              const label = config.xLabels?.[i] ?? String(i);
              return label + (config.xSuffix ?? "");
            },
          },
        },
        y: {
          min: config.yMin,
          max: config.yMax,
          grid: { color: GRID },
          border: { display: false },
          ticks: {
            color: "#666660",
            font: { size: 13, family: "sans-serif" },
            callback: (v: unknown) => `${v}${config.ySuffix ?? ""}`,
          },
        },
      },
    },
  };

  return await canvas.renderToBuffer(chartConfig);
}
