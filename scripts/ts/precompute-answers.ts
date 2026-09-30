/**
 * EMBER · precompute-answers.ts (project.md §10.6)
 * Runs the suggested questions, the out-of-scope checks and the five mission digests through the live pipeline and
 * stores the answers with their citations in data/processed/precomputed-answers.json, so Ask the Flame and the
 * Mission Control digest work with no network and no key. Every stored citation is checked against chunks.json.
 *
 * Usage (PowerShell, needs AI_PROVIDER + key in .env.local):
 *   npx tsx --conditions=react-server scripts/ts/precompute-answers.ts          # keep existing answers
 *   npx tsx --conditions=react-server scripts/ts/precompute-answers.ts --force  # regenerate everything
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
if (existsSync(resolve(ROOT, ".env.local"))) process.loadEnvFile(resolve(ROOT, ".env.local"));

const OUT = resolve(ROOT, "data/processed/precomputed-answers.json");
const FORCE = process.argv.includes("--force");
const PAUSE_MS = 2500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

async function main() {
  const { answerQuestion } = await import("../../src/lib/ai/answer");
  const { generateDigest } = await import("../../src/lib/ai/digest");
  const { normalizeAnswer, segmentAnswer, usedAliases } = await import("../../src/lib/ai/citations");
  const { providerStatus } = await import("../../src/lib/ai/provider");
  const { SUGGESTED_QUESTIONS, OUT_OF_SCOPE_CHECKS } = await import("../../src/content/ask");
  const { MISSIONS } = await import("../../src/lib/missions");
  const { ChunksFileSchema, PrecomputedAnswersFileSchema } = await import("../../src/lib/schema");
  type PrecomputedAnswer = import("../../src/lib/schema").PrecomputedAnswer;
  type AliasMap = import("../../src/lib/ai/citations").AliasMap;

  const status = providerStatus();
  if (!status.available) {
    console.error("No AI provider configured (AI_PROVIDER + key in .env.local). Nothing to precompute.");
    process.exit(1);
  }
  const generatedBy = `${status.provider}:${status.modelId}`;
  console.log(`precompute: ${generatedBy}${FORCE ? " (force)" : ""}`);

  const chunkIds = new Set(ChunksFileSchema.parse(JSON.parse(readFileSync(resolve(ROOT, "data/processed/chunks.json"), "utf8"))).map((c) => c.id));
  const existing: PrecomputedAnswer[] = existsSync(OUT) ? PrecomputedAnswersFileSchema.parse(JSON.parse(readFileSync(OUT, "utf8"))) : [];
  const byId = new Map(existing.map((a) => [a.id, a]));
  const keep = (id: string) => !FORCE && byId.has(id);

  /** Strip invalid citations from the text and store the alias table in S1..Sn order. */
  const finalise = (raw: string, aliases: AliasMap) => {
    const text = normalizeAnswer(raw).replace(/\[\[\s*([^\]]+?)\s*\]\]/g, (m, inner: string) =>
      inner
        .split(/[,\s]+/)
        .filter((a) => aliases[a.toUpperCase()])
        .map((a) => `[[${a.toUpperCase()}]]`)
        .join(""),
    );
    const ordered = Object.keys(aliases).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    const citations = ordered.map((k) => {
      const { chunkId, sourceId, page, label, excerpt } = aliases[k];
      return { chunkId, sourceId, page, label, ...(excerpt ? { excerpt } : {}) };
    });
    for (const c of citations) if (!chunkIds.has(c.chunkId)) throw new Error(`citation to unknown chunk ${c.chunkId}`);
    return { text, citations, used: usedAliases(text, aliases), invalid: segmentAnswer(raw, aliases).invalid };
  };

  const notCoveredOf = (text: string) => text.split(/###\s*Not covered by the data\s*/i)[1]?.trim().split("\n\n")[0]?.trim() || undefined;

  // 1. Suggested questions — must come back from the model (mode "ai"), retried with backoff on rate limits.
  for (const { question, mission } of SUGGESTED_QUESTIONS) {
    const id = `suggested-${mission}-${slug(question)}`;
    if (keep(id)) {
      console.log(`  keep  ${id}`);
      continue;
    }
    let done = false;
    for (let attempt = 1; attempt <= 4 && !done; attempt++) {
      const { meta, finished, stream } = await answerQuestion(question, mission);
      for await (const _ of stream) void _;
      const raw = await finished;
      if (meta.mode === "refusal") throw new Error(`Suggested question was refused by the relevance gate: "${question}" (max cosine ${meta.retrieval.maxCosine})`);
      if (meta.mode !== "ai") {
        const wait = 15_000 * attempt;
        console.warn(`  model unavailable for "${question}" (mode ${meta.mode}); retrying in ${wait / 1000} s`);
        await sleep(wait);
        continue;
      }
      const { text, citations, used, invalid } = finalise(raw, meta.aliases);
      if (!used.length) {
        console.warn(`  no valid citations in answer to "${question}"; retrying`);
        await sleep(PAUSE_MS);
        continue;
      }
      byId.set(id, {
        id,
        question,
        mission,
        kind: "suggested",
        answer: text,
        citations,
        confidence: meta.confidence,
        notCovered: notCoveredOf(text),
        generatedBy,
        generatedAt: new Date().toISOString(),
      });
      console.log(`  ok    ${id}  cites ${used.join(",")}${invalid.length ? `  stripped ${invalid.join(",")}` : ""}`);
      done = true;
      await sleep(PAUSE_MS);
    }
    if (!done) throw new Error(`Could not precompute "${question}"`);
  }

  // 2. Out-of-scope checks — must be refused by the relevance gate (no model call involved).
  for (const question of OUT_OF_SCOPE_CHECKS) {
    const id = `out-of-scope-${slug(question)}`;
    const { meta, finished, stream } = await answerQuestion(question, "iss");
    for await (const _ of stream) void _;
    const raw = await finished;
    if (meta.mode !== "refusal") throw new Error(`Out-of-scope question was NOT refused: "${question}" (max cosine ${meta.retrieval.maxCosine})`);
    byId.set(id, {
      id,
      question,
      kind: "out-of-scope",
      answer: raw,
      citations: [],
      confidence: "none",
      notCovered: "This question.",
      generatedBy: "relevance-gate",
      generatedAt: new Date().toISOString(),
    });
    console.log(`  ok    ${id}  refused (max cosine ${meta.retrieval.maxCosine?.toFixed(3)})`);
  }

  // 3. Mission digests for Mission Control.
  for (const m of MISSIONS) {
    const id = `digest-${m.id}`;
    if (keep(id)) {
      console.log(`  keep  ${id}`);
      continue;
    }
    let done = false;
    for (let attempt = 1; attempt <= 4 && !done; attempt++) {
      try {
        const d = await generateDigest(m.id);
        if (!d) throw new Error("provider unavailable");
        const { text, citations, used, invalid } = finalise(d.text, d.aliases);
        if (!used.length) throw new Error("digest has no valid citations");
        byId.set(id, {
          id,
          question: `Evidence digest for ${m.label}`,
          mission: m.id,
          kind: "digest",
          answer: text,
          citations,
          confidence: "medium",
          generatedBy: d.generatedBy,
          generatedAt: new Date().toISOString(),
        });
        console.log(`  ok    ${id}  cites ${used.join(",")}${invalid.length ? `  stripped ${invalid.join(",")}` : ""}`);
        done = true;
      } catch (err) {
        const wait = 15_000 * attempt;
        console.warn(`  digest ${m.id} failed (${(err as Error).message}); retrying in ${wait / 1000} s`);
        await sleep(wait);
      }
    }
    if (!done) throw new Error(`Could not generate digest for ${m.id}`);
    await sleep(PAUSE_MS);
  }

  const out = PrecomputedAnswersFileSchema.parse(Array.from(byId.values()));
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
  const counts = out.reduce<Record<string, number>>((acc, a) => ((acc[a.kind] = (acc[a.kind] ?? 0) + 1), acc), {});
  console.log(`precomputed-answers.json: ${out.length} answers ${JSON.stringify(counts)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
