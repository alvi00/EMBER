/**
 * EMBER · extract-findings.ts
 *
 * Builds data/processed/findings.json from candidate findings.
 *
 * Candidate source (project.md §10.4): no AI key was available when the knowledge base was built, so the candidates in
 * data/curation/findings.draft.json were drafted directly by Claude Code from the extracted chunks, under the same rules
 * an LLM extractor would follow. This script enforces those rules:
 *   - every evidence excerpt is ≤ 25 words and must be a verbatim (whitespace-normalised) substring of a chunk of the
 *     cited source — the chunk id and page are resolved here, never typed by hand;
 *   - findings failing any rule are rejected and reported;
 *   - every new finding gets status "ai-draft". Human decisions already stored in findings.json (verified / rejected /
 *     edited fields + reviewer) are preserved on re-runs, so the /review workflow is never overwritten.
 *
 * Usage (PowerShell):  npx tsx scripts/ts/extract-findings.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ChunksFileSchema, FindingSchema, type Chunk, type Finding } from "../../src/lib/schema";

const ROOT = resolve(import.meta.dirname, "..", "..");
const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

type Draft = Omit<Finding, "evidence" | "status" | "reviewer"> & {
  evidence: { sourceId: string; excerpt: string }[];
};

const chunks = ChunksFileSchema.parse(JSON.parse(readFileSync(resolve(ROOT, "data/processed/chunks.json"), "utf8")));
const bySource = new Map<string, Chunk[]>();
for (const c of chunks) {
  const list = bySource.get(c.sourceId) ?? [];
  list.push(c);
  bySource.set(c.sourceId, list);
}

const drafts: Draft[] = JSON.parse(readFileSync(resolve(ROOT, "data/curation/findings.draft.json"), "utf8"));
const outPath = resolve(ROOT, "data/processed/findings.json");
const existing: Finding[] = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : [];
const existingById = new Map(existing.map((f) => [f.id, f]));

const accepted: Finding[] = [];
const rejected: string[] = [];

for (const d of drafts) {
  const prior = existingById.get(d.id);
  // A human already reviewed this finding: keep their version untouched.
  if (prior && (prior.status === "verified" || prior.status === "rejected" || prior.reviewer)) {
    accepted.push(prior);
    continue;
  }
  const evidence: Finding["evidence"] = [];
  let ok = true;
  for (const ev of d.evidence) {
    const words = normalize(ev.excerpt).split(" ").length;
    if (words > 25) {
      rejected.push(`${d.id}: excerpt has ${words} words (> 25)`);
      ok = false;
      continue;
    }
    const needle = normalize(ev.excerpt);
    const hit = (bySource.get(ev.sourceId) ?? []).find((c) => normalize(c.text).includes(needle));
    if (!hit) {
      rejected.push(`${d.id}: excerpt not found verbatim in any chunk of ${ev.sourceId}: "${needle.slice(0, 70)}…"`);
      ok = false;
      continue;
    }
    evidence.push({ sourceId: ev.sourceId, chunkId: hit.id, ...(hit.page ? { page: hit.page } : {}), excerpt: needle });
  }
  if (!ok) continue;
  const finding = FindingSchema.parse({ ...d, evidence, status: "ai-draft" });
  accepted.push(finding);
}

// Keep findings a human created in /review that are not in the draft file.
for (const f of existing) {
  if (!drafts.some((d) => d.id === f.id) && f.reviewer) accepted.push(f);
}

writeFileSync(outPath, JSON.stringify(accepted, null, 1) + "\n", "utf8");
const investigations = new Set(accepted.map((f) => f.experimentId));
console.log(`findings: ${accepted.length} accepted across ${investigations.size} investigations, ${rejected.length} rejected`);
for (const r of rejected) console.log(`  ✗ ${r}`);
if (rejected.length) process.exitCode = 1;
