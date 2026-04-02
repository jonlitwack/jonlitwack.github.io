"use client";

import { useEffect } from "react";

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
  source?: string;
  xLabels?: string[];
  xSuffix?: string;
  ySuffix?: string;
  yMin?: number;
  yMax?: number;
  height?: number;
}

function buildChartConfig(c: ChartBlock) {
  const GRID = "rgba(255,255,255,0.06)";

  return {
    type: c.type,
    data: {
      labels: c.xLabels ?? c.datasets[0].data.map((_: unknown, i: number) => String(i)),
      datasets: c.datasets.map((ds) => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color,
        backgroundColor: ds.color + "1a",
        borderWidth: ds.width ?? 2.5,
        borderDash: ds.dash ?? [],
        fill: ds.fill ?? c.type === "bar",
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        spanGaps: false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1a1a14",
          borderColor: "#2e2e28",
          borderWidth: 1,
          titleColor: "#e8e6df",
          bodyColor: "#9a9a8e",
          padding: 10,
          filter: (item: { parsed: { y: number | null } }) =>
            item.parsed.y !== null,
          callbacks: {
            label: (ctx: {
              parsed: { y: number | null };
              dataset: { label?: string };
            }) =>
              ctx.parsed.y === null
                ? ""
                : `  ${ctx.dataset.label ?? ""}: ${ctx.parsed.y}${c.ySuffix ?? ""}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: GRID },
          border: { display: false },
          ticks: {
            color: "#666660",
            font: { size: 11, family: "'IBM Plex Mono', monospace" },
            callback: (_: unknown, i: number) => {
              const label = c.xLabels?.[i] ?? String(i);
              return label + (c.xSuffix ?? "");
            },
          },
        },
        y: {
          min: c.yMin,
          max: c.yMax,
          grid: { color: GRID },
          border: { display: false },
          ticks: {
            color: "#666660",
            font: { size: 11, family: "'IBM Plex Mono', monospace" },
            callback: (v: unknown) => `${v}${c.ySuffix ?? ""}`,
          },
        },
      },
    },
  };
}

export function ChartHydrator() {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLElement>(
      ".chart-block[data-chart]"
    );
    if (!blocks.length) return;

    import("chart.js/auto").then(({ default: Chart }) => {
      blocks.forEach((block) => {
        const id = block.dataset.chartId!;
        const canvas = document.getElementById(id) as HTMLCanvasElement | null;
        if (!canvas) return;

        if (canvas.dataset.hydrated) return;
        canvas.dataset.hydrated = "true";

        const config: ChartBlock = JSON.parse(
          atob(block.dataset.chart!)
        );

        new Chart(canvas, buildChartConfig(config));
      });
    });
  }, []);

  return null;
}
