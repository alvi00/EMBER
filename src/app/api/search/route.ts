import { NextResponse } from "next/server";
import { searchExperiments } from "@/lib/search";

/** GET /api/search?q= → experiments ranked by hybrid (BM25 + embedding) retrieval over their source passages. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ mode: "none", results: [] });
  if (q.length > 300) return NextResponse.json({ error: "Query too long" }, { status: 400 });
  const out = await searchExperiments(q);
  return NextResponse.json(out);
}
