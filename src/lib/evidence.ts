import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { allFindings } from "@/lib/data";
import type { Chunk, Finding } from "@/lib/schema";

export type EvidenceRef = {
  sourceId: string;
  chunkId: string;
  page?: number;
  excerpt: string;
  findingId?: string;
  status?: Finding["status"];
};

let chunkCache: Chunk[] | null = null;
function chunks(): Chunk[] {
  if (!chunkCache) {
    chunkCache = JSON.parse(readFileSync(path.join(process.cwd(), "data", "processed", "chunks.json"), "utf8"));
  }
  return chunkCache!;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Evidence item `index` of a finding, with the finding's review status (rejected findings return null). */
export function findingEvidence(findingId: string, index = 0): EvidenceRef | null {
  const f = allFindings.find((x) => x.id === findingId);
  if (!f || f.status === "rejected") return null;
  const ev = f.evidence[index];
  if (!ev) return null;
  return { ...ev, findingId, status: f.status };
}

/** Locate a verbatim excerpt in a source's chunks (used for non-finding copy such as the NASA explainer). */
export function sourceExcerpt(sourceId: string, excerpt: string): EvidenceRef | null {
  const needle = norm(excerpt);
  const hit = chunks().find((c) => c.sourceId === sourceId && norm(c.text).includes(needle));
  if (!hit) return null;
  return { sourceId, chunkId: hit.id, page: hit.page, excerpt: needle };
}

/** Number of knowledge-base passages (chunks) — shown in the pipeline section. */
export function passageCount(): number {
  return chunks().length;
}
