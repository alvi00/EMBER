/**
 * EMBER · validate-data.ts
 * Validates every data file against the zod schemas in src/lib/schema.ts and checks cross-references:
 *   - every experiment has ≥ 1 source and all its source ids exist
 *   - every source's experiment ids exist
 *   - every finding references a real experiment, real sources and real chunks,
 *     and every evidence excerpt is a verbatim substring of its chunk (whitespace-normalised)
 *   - no finding is "verified" without a reviewer; Claude-drafted findings stay "ai-draft"
 *   - every measurement references a real experiment and source
 *
 * Usage (PowerShell):  npm run data:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { z } from "zod";
import {
  ChunksFileSchema,
  ExperimentsFileSchema,
  FindingsFileSchema,
  GlossaryFileSchema,
  MeasurementsFileSchema,
  PrecomputedAnswersFileSchema,
  SourcesFileSchema,
} from "../../src/lib/schema";

const ROOT = resolve(import.meta.dirname, "..", "..");
const errors: string[] = [];
const warnings: string[] = [];

function load<T extends z.ZodType>(rel: string, schema: T, required: boolean): z.infer<T> | null {
  const path = resolve(ROOT, rel);
  if (!existsSync(path)) {
    if (required) errors.push(`${rel}: missing`);
    else warnings.push(`${rel}: not built yet`);
    return null;
  }
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 25)) {
      errors.push(`${rel}: [${issue.path.join(".")}] ${issue.message}`);
    }
    if (parsed.error.issues.length > 25) errors.push(`${rel}: …and ${parsed.error.issues.length - 25} more issues`);
    return null;
  }
  return parsed.data;
}

export const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

const sources = load("data/sources.json", SourcesFileSchema, true);
const experiments = load("data/processed/experiments.json", ExperimentsFileSchema, true);
const findings = load("data/processed/findings.json", FindingsFileSchema, false);
const measurements = load("data/processed/measurements.json", MeasurementsFileSchema, false);
const chunks = load("data/processed/chunks.json", ChunksFileSchema, false);
const glossary = load("data/processed/glossary.json", GlossaryFileSchema, false);
const answers = load("data/processed/precomputed-answers.json", PrecomputedAnswersFileSchema, false);

const sourceIds = new Set((sources ?? []).map((s) => s.id));
const experimentIds = new Set((experiments ?? []).map((e) => e.id));
const chunkById = new Map((chunks ?? []).map((c) => [c.id, c]));

function dupes(ids: string[], label: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${label}: duplicate id ${id}`);
    seen.add(id);
  }
}

if (sources) {
  dupes(sources.map((s) => s.id), "sources");
  for (const s of sources) {
    for (const eid of s.experimentIds) {
      if (!experimentIds.has(eid)) errors.push(`source ${s.id}: unknown experiment ${eid}`);
    }
    if (s.localPath && !existsSync(resolve(ROOT, s.localPath))) warnings.push(`source ${s.id}: local file missing (${s.localPath})`);
  }
}

if (experiments) {
  dupes(experiments.map((e) => e.id), "experiments");
  for (const e of experiments) {
    if (e.sourceIds.length < 1) errors.push(`experiment ${e.id}: no sources`);
    for (const sid of [...e.sourceIds, ...e.conditionsSourceIds]) {
      if (!sourceIds.has(sid)) errors.push(`experiment ${e.id}: unknown source ${sid}`);
    }
    if (e.verified) warnings.push(`experiment ${e.id}: marked verified (must be set by a human reviewer)`);
    if (e.years.start < 1950) errors.push(`experiment ${e.id}: missing start year`);
  }
}

if (findings) {
  dupes(findings.map((f) => f.id), "findings");
  for (const f of findings) {
    if (!experimentIds.has(f.experimentId)) errors.push(`finding ${f.id}: unknown experiment ${f.experimentId}`);
    if (f.status === "verified" && !f.reviewer) errors.push(`finding ${f.id}: verified without a reviewer`);
    for (const ev of f.evidence) {
      if (!sourceIds.has(ev.sourceId)) errors.push(`finding ${f.id}: unknown source ${ev.sourceId}`);
      const chunk = chunkById.get(ev.chunkId);
      if (!chunk) {
        errors.push(`finding ${f.id}: unknown chunk ${ev.chunkId}`);
        continue;
      }
      if (chunk.sourceId !== ev.sourceId) errors.push(`finding ${f.id}: chunk ${ev.chunkId} belongs to ${chunk.sourceId}`);
      if (!normalize(chunk.text).includes(normalize(ev.excerpt))) {
        errors.push(`finding ${f.id}: excerpt not found verbatim in ${ev.chunkId}: "${ev.excerpt.slice(0, 60)}…"`);
      }
      if (ev.page !== undefined && chunk.page !== undefined && ev.page !== chunk.page) {
        errors.push(`finding ${f.id}: page ${ev.page} ≠ chunk page ${chunk.page}`);
      }
    }
  }
}

if (measurements) {
  dupes(measurements.map((m) => m.id), "measurements");
  for (const m of measurements) {
    if (!experimentIds.has(m.experimentId)) errors.push(`measurement ${m.id}: unknown experiment ${m.experimentId}`);
    if (!sourceIds.has(m.sourceId)) errors.push(`measurement ${m.id}: unknown source ${m.sourceId}`);
  }
}

if (chunks) {
  dupes(chunks.map((c) => c.id), "chunks");
  for (const c of chunks) if (!sourceIds.has(c.sourceId)) errors.push(`chunk ${c.id}: unknown source ${c.sourceId}`);
}

if (answers) {
  for (const a of answers) {
    for (const c of a.citations) {
      const chunk = chunkById.get(c.chunkId);
      if (!chunk) {
        errors.push(`answer ${a.id}: citation to unknown chunk ${c.chunkId}`);
        continue;
      }
      if (chunk.sourceId !== c.sourceId) errors.push(`answer ${a.id}: citation ${c.chunkId} has source ${c.sourceId}, chunk says ${chunk.sourceId}`);
      if (c.excerpt && !chunk.text.replace(/\s+/g, " ").includes(c.excerpt.replace(/\s+/g, " ").trim())) {
        errors.push(`answer ${a.id}: excerpt is not verbatim in ${c.chunkId}`);
      }
    }
    // Every [[S#]] marker in the stored text must resolve to a stored citation (S1 = citations[0]).
    for (const m of a.answer.matchAll(/\[\[\s*(S\d+)\s*\]\]/gi)) {
      const i = Number(m[1].slice(1)) - 1;
      if (!a.citations[i]) errors.push(`answer ${a.id}: marker ${m[1]} has no citation`);
    }
    if (a.kind === "out-of-scope" && a.citations.length) errors.push(`answer ${a.id}: a refusal must not cite sources`);
  }
}

// ---------- report ----------
const byStatus = (findings ?? []).reduce<Record<string, number>>((acc, f) => {
  acc[f.status] = (acc[f.status] ?? 0) + 1;
  return acc;
}, {});
const investigationsWithFindings = new Set((findings ?? []).map((f) => f.experimentId)).size;

console.log("EMBER data validation");
console.log(`  sources       ${sources?.length ?? "—"}`);
console.log(`  experiments   ${experiments?.length ?? "—"}`);
console.log(`  findings      ${findings?.length ?? "—"} ${findings ? JSON.stringify(byStatus) : ""} across ${investigationsWithFindings} investigations`);
console.log(`  measurements  ${measurements?.length ?? "—"}`);
console.log(`  chunks        ${chunks?.length ?? "—"}`);
console.log(`  glossary      ${glossary?.length ?? "—"}`);
console.log(`  answers       ${answers?.length ?? "—"}`);
for (const w of warnings) console.log(`  warn: ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("\n✓ all data valid");
