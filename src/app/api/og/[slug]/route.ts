import { NextRequest, NextResponse } from "next/server";
import { getEssay } from "@/lib/github";
import { extractHeroChart, renderChartToImage } from "@/lib/chartRenderer";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const essay = await getEssay(slug);
    const chart = extractHeroChart(essay.content);

    if (!chart) {
      return NextResponse.json({ error: "No chart found" }, { status: 404 });
    }

    const png = await renderChartToImage(chart);

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
