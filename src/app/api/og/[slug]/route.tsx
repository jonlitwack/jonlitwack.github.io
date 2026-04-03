import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getEssay } from "@/lib/github";
import { extractHeroChart } from "@/lib/chartRenderer";

export const runtime = "edge";

const WIDTH = 1200;
const HEIGHT = 630;
const PADDING = { top: 80, right: 60, bottom: 60, left: 70 };
const CHART_W = WIDTH - PADDING.left - PADDING.right;
const CHART_H = HEIGHT - PADDING.top - PADDING.bottom;

interface ChartConfig {
  type: string;
  title?: string;
  datasets: { label: string; color: string; data: (number | null)[] }[];
  xLabels?: string[];
  xSuffix?: string;
  ySuffix?: string;
  yMin?: number;
  yMax?: number;
}

function buildPoints(
  data: (number | null)[],
  yMin: number,
  yMax: number
): string {
  const range = yMax - yMin || 1;
  return data
    .map((v, i) => {
      if (v === null) return null;
      const x = PADDING.left + (i / (data.length - 1)) * CHART_W;
      const y = PADDING.top + (1 - (v - yMin) / range) * CHART_H;
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const essay = await getEssay(slug);
    const chart = extractHeroChart(essay.content) as ChartConfig | null;

    if (!chart) {
      return new Response("No chart found", { status: 404 });
    }

    const allData = chart.datasets.flatMap((ds) =>
      ds.data.filter((v): v is number => v !== null)
    );
    const yMin = chart.yMin ?? Math.min(...allData);
    const yMax = chart.yMax ?? Math.max(...allData);

    // Y-axis ticks
    const yTicks: number[] = [];
    const yStep = (yMax - yMin) / 5;
    for (let i = 0; i <= 5; i++) {
      yTicks.push(Math.round(yMin + yStep * i));
    }

    // X-axis ticks (show ~6 labels)
    const dataLen = chart.datasets[0].data.length;
    const xStep = Math.max(1, Math.floor(dataLen / 5));
    const xTicks: number[] = [];
    for (let i = 0; i < dataLen; i += xStep) {
      xTicks.push(i);
    }

    return new ImageResponse(
      (
        <div
          style={{
            width: WIDTH,
            height: HEIGHT,
            background: "#161a1f",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* Title */}
          {chart.title && (
            <div
              style={{
                position: "absolute",
                top: 24,
                left: PADDING.left,
                color: "#8a9098",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
              }}
            >
              {chart.title}
            </div>
          )}

          {/* Grid lines */}
          {yTicks.map((tick) => {
            const y =
              PADDING.top + (1 - (tick - yMin) / (yMax - yMin || 1)) * CHART_H;
            return (
              <div
                key={`grid-${tick}`}
                style={{
                  position: "absolute",
                  left: PADDING.left,
                  top: y,
                  width: CHART_W,
                  height: 1,
                  background: "rgba(255,255,255,0.06)",
                }}
              />
            );
          })}

          {/* Y-axis labels */}
          {yTicks.map((tick) => {
            const y =
              PADDING.top + (1 - (tick - yMin) / (yMax - yMin || 1)) * CHART_H;
            return (
              <div
                key={`ytick-${tick}`}
                style={{
                  position: "absolute",
                  right: WIDTH - PADDING.left + 8,
                  top: y - 8,
                  color: "#666660",
                  fontSize: 12,
                  textAlign: "right",
                  width: PADDING.left - 16,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                {`${tick}${chart.ySuffix ?? ""}`}
              </div>
            );
          })}

          {/* X-axis labels */}
          {xTicks.map((i) => {
            const x = PADDING.left + (i / (dataLen - 1)) * CHART_W;
            const label = chart.xLabels?.[i] ?? String(i);
            return (
              <div
                key={`xtick-${i}`}
                style={{
                  position: "absolute",
                  left: x - 20,
                  top: PADDING.top + CHART_H + 12,
                  color: "#666660",
                  fontSize: 12,
                  width: 40,
                  textAlign: "center",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {label + (chart.xSuffix ?? "")}
              </div>
            );
          })}

          {/* Chart lines as SVG */}
          <svg
            width={WIDTH}
            height={HEIGHT}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            {chart.datasets.map((ds, di) => (
              <polyline
                key={di}
                points={buildPoints(ds.data, yMin, yMax)}
                fill="none"
                stroke={ds.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          </svg>

          {/* Legend */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              right: PADDING.right,
              display: "flex",
              gap: 20,
            }}
          >
            {chart.datasets.map((ds, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 3,
                    background: ds.color,
                    borderRadius: 2,
                  }}
                />
                <span style={{ color: "#666660", fontSize: 11 }}>
                  {ds.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
      {
        width: WIDTH,
        height: HEIGHT,
      }
    );
  } catch {
    return new Response("Failed to generate image", { status: 500 });
  }
}
