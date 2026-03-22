import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getEssay } from "@/lib/github";

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
