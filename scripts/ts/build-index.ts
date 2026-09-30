/**
 * EMBER · build-index.ts
 * Builds the BM25 (MiniSearch) index over knowledge-base chunks → data/processed/search-index.json.
 * Chunk text and source title are indexed; results are joined back to chunks.json by id at query time.
 *
 * Usage (PowerShell):  npx tsx scripts/ts/build-index.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import MiniSearch from "minisearch";
import { ChunksFileSchema, SourcesFileSchema } from "../../src/lib/schema";
import { CHUNK_INDEX_OPTIONS, processTerm } from "../../src/lib/search-config";

const ROOT = resolve(import.meta.dirname, "..", "..");
const chunks = ChunksFileSchema.parse(JSON.parse(readFileSync(resolve(ROOT, "data/processed/chunks.json"), "utf8")));
const sources = SourcesFileSchema.parse(JSON.parse(readFileSync(resolve(ROOT, "data/sources.json"), "utf8")));
const titleOf = new Map(sources.map((s) => [s.id, s.title]));

const index = new MiniSearch({
  ...CHUNK_INDEX_OPTIONS,
  processTerm,
});
index.addAll(chunks.map((c) => ({ id: c.id, title: titleOf.get(c.sourceId) ?? "", text: c.text })));
const json = JSON.stringify(index);
writeFileSync(resolve(ROOT, "data/processed/search-index.json"), json);
console.log(`search index: ${index.documentCount} chunks → ${(json.length / 1e6).toFixed(2)} MB`);
const probe = index.search("flame spread lunar gravity oxygen").slice(0, 3);
console.log("probe:", probe.map((r) => `${r.id} (${r.score.toFixed(1)})`).join(", "));
