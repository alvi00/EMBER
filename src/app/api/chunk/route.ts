import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { Chunk } from "@/lib/schema";

let cache: Map<string, Chunk> | null = null;

async function chunks(): Promise<Map<string, Chunk>> {
  if (!cache) {
    const raw: Chunk[] = JSON.parse(await readFile(path.join(process.cwd(), "data", "processed", "chunks.json"), "utf8"));
    cache = new Map(raw.map((c) => [c.id, c]));
  }
  return cache;
}

/** GET /api/chunk?id=<chunkId> → one knowledge-base chunk (used by the SourceDrawer to show cited text). */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const chunk = (await chunks()).get(id);
  if (!chunk) return NextResponse.json({ error: "Chunk not found" }, { status: 404 });
  return NextResponse.json({ chunk }, { headers: { "cache-control": "public, max-age=3600" } });
}
