import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getEssay, deleteEssay } from "@/lib/github";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  try {
    const essay = await getEssay(slug);
    return NextResponse.json(essay);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  try {
    const essay = await getEssay(slug);
    if (!essay.sha) {
      return NextResponse.json({ error: "Missing SHA" }, { status: 400 });
    }
    await deleteEssay(slug, essay.sha);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
