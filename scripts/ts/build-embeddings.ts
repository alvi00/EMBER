/**
 * EMBER · build-embeddings.ts
 * Embeds every knowledge-base chunk with Xenova/all-MiniLM-L6-v2 (transformers.js, q8 ONNX, mean pooling, L2-normalised)
 * and writes int8-quantised vectors to data/processed/embeddings.json.
 * The model is cached in ./models-cache so the runtime copilot can embed queries offline.
 *
 * Usage (PowerShell):  npx tsx scripts/ts/build-embeddings.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ChunksFileSchema, SourcesFileSchema } from "../../src/lib/schema";
import { EMBEDDING_MODEL, embed, quantize } from "../../src/lib/embeddings";

const ROOT = resolve(import.meta.dirname, "..", "..");
const chunks = ChunksFileSchema.parse(JSON.parse(readFileSync(resolve(ROOT, "data/processed/chunks.json"), "utf8")));
const sources = SourcesFileSchema.parse(JSON.parse(readFileSync(resolve(ROOT, "data/sources.json"), "utf8")));
const titleOf = new Map(sources.map((s) => [s.id, s.title]));

const BATCH = 32;

async function main() {
  const vectors: number[][] = [];
  const started = Date.now();
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH).map((c) => `${titleOf.get(c.sourceId) ?? ""}. ${c.text}`);
    vectors.push(...(await embed(batch)));
    if ((i / BATCH) % 20 === 0) {
      const pct = Math.round(((i + batch.length) / chunks.length) * 100);
      console.log(`  ${i + batch.length}/${chunks.length} (${pct}%) ${((Date.now() - started) / 1000).toFixed(0)} s`);
    }
  }
  const q = quantize(
    vectors,
    chunks.map((c) => c.id),
    EMBEDDING_MODEL,
  );
  const out = resolve(ROOT, "data/processed/embeddings.json");
  writeFileSync(out, JSON.stringify(q));
  console.log(
    `embeddings: ${q.count} × ${q.dim} (int8) → ${(JSON.stringify(q).length / 1e6).toFixed(2)} MB in ${((Date.now() - started) / 1000).toFixed(0)} s`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
