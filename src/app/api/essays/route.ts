import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Octokit } from "@octokit/rest";
import { listEssays, saveEssay } from "@/lib/github";
import { extractHeroChart, renderChartToImage } from "@/lib/chartRenderer";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = "jonlitwack";
const REPO = "jonlitwack.github.io";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const essays = await listEssays();
  return NextResponse.json(essays);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, title, date, body, sha, image } = await req.json();

  if (!slug || !title || !body) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const essayDate = date || new Date().toISOString();

  // If no hero image, try to generate one from a chart
  let ogImage = image;
  if (!ogImage) {
    const chart = extractHeroChart(body);
    if (chart) {
      try {
        const pngBuffer = await renderChartToImage(chart);
        const filename = `og-${slug}.png`;
        const path = `public/images/${filename}`;
        const base64 = pngBuffer.toString("base64");

        // Check if file already exists to get its SHA
        let existingSha: string | undefined;
        try {
          const { data } = await octokit.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path,
          });
          if (!Array.isArray(data) && data.type === "file") {
            existingSha = data.sha;
          }
        } catch {
          // File doesn't exist yet, that's fine
        }

        await octokit.repos.createOrUpdateFileContents({
          owner: OWNER,
          repo: REPO,
          path,
          message: `Generate OG image: ${slug}`,
          content: base64,
          ...(existingSha ? { sha: existingSha } : {}),
        });

        ogImage = `/images/${filename}`;
      } catch (err) {
        console.error("Failed to generate chart OG image:", err);
        // Continue without OG image — don't block publish
      }
    }
  }

  await saveEssay(slug, title, essayDate, body, sha, ogImage);

  return NextResponse.json({ ok: true });
}
