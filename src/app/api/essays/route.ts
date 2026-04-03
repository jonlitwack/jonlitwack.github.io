import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { listEssays, saveEssay } from "@/lib/github";

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

  await saveEssay(slug, title, essayDate, body, sha, image);

  return NextResponse.json({ ok: true });
}
