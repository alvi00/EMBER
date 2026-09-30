import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import MiniSearch from "minisearch";
import { cosine, dequantize, embed, type QuantizedEmbeddings } from "@/lib/embeddings";
import { CHUNK_INDEX_OPTIONS, processTerm } from "@/lib/search-config";
import type { Chunk } from "@/lib/schema";

/**
 * Hybrid retrieval (project.md §10.2): MiniSearch BM25 top-20 ∪ embedding cosine top-20 → reciprocal-rank fusion.
 * Query embeddings use the same transformers.js model as the build step (cached in memory, model files in
 * ./models-cache so it works offline). If the model cannot load, retrieval degrades to BM25 only.
 */

type Store = {
  index: MiniSearch;
  chunks: Chunk[];
  byId: Map<string, Chunk>;
  vectors: Float32Array[];
  vectorIds: string[];
};

let store: Store | null = null;

function dataFile(file: string): string {
  return readFileSync(path.join(process.cwd(), "data", "processed", file), "utf8");
}

function load(): Store {
  if (store) return store;
  const chunks: Chunk[] = JSON.parse(dataFile("chunks.json"));
  const index = MiniSearch.loadJSON(dataFile("search-index.json"), { ...CHUNK_INDEX_OPTIONS, processTerm });
  const q: QuantizedEmbeddings = JSON.parse(dataFile("embeddings.json"));
  store = {
    index,
    chunks,
    byId: new Map(chunks.map((c) => [c.id, c])),
    vectors: dequantize(q),
    vectorIds: q.ids,
  };
  return store;
}

export type Hit = { chunk: Chunk; score: number; bm25Rank?: number; vectorRank?: number; cosine?: number };

const RRF_K = 60;

export async function hybridSearch(
  query: string,
  opts: { k?: number; pool?: number; experimentId?: string; semantic?: boolean } = {},
): Promise<{ hits: Hit[]; mode: "hybrid" | "lexical"; queryVector?: number[] }> {
  const { k = 8, pool = 20, experimentId, semantic = true } = opts;
  const s = load();
  const inScope = (id: string) => !experimentId || (s.byId.get(id)?.experimentIds.includes(experimentId) ?? false);

  const lexical = s.index
    .search(query, { filter: (r) => inScope(String(r.id)) })
    .slice(0, pool)
    .map((r) => String(r.id));

  let vector: string[] = [];
  let cosById = new Map<string, number>();
  let queryVector: number[] | undefined;
  let mode: "hybrid" | "lexical" = "lexical";
  if (semantic) {
    try {
      [queryVector] = await embed([query]);
      const scored: { id: string; c: number }[] = [];
      for (let i = 0; i < s.vectors.length; i++) {
        const id = s.vectorIds[i];
        if (!inScope(id)) continue;
        scored.push({ id, c: cosine(queryVector, s.vectors[i]) });
      }
      scored.sort((a, b) => b.c - a.c);
      vector = scored.slice(0, pool).map((x) => x.id);
      cosById = new Map(scored.slice(0, pool).map((x) => [x.id, x.c]));
      mode = "hybrid";
    } catch (err) {
      console.warn("EMBER search: embedding model unavailable, using BM25 only.", (err as Error).message);
    }
  }

  const fused = new Map<string, Hit>();
  lexical.forEach((id, i) => {
    const chunk = s.byId.get(id);
    if (!chunk) return;
    fused.set(id, { chunk, score: 1 / (RRF_K + i + 1), bm25Rank: i + 1 });
  });
  vector.forEach((id, i) => {
    const chunk = s.byId.get(id);
    if (!chunk) return;
    const prev = fused.get(id);
    const add = 1 / (RRF_K + i + 1);
    if (prev) {
      prev.score += add;
      prev.vectorRank = i + 1;
      prev.cosine = cosById.get(id);
    } else {
      fused.set(id, { chunk, score: add, vectorRank: i + 1, cosine: cosById.get(id) });
    }
  });

  const hits = Array.from(fused.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return { hits, mode, queryVector };
}

/** Aggregate chunk hits to experiments (best fused score per experiment) for the explorer's hybrid search. */
export async function searchExperiments(query: string) {
  const { hits, mode } = await hybridSearch(query, { k: 40, pool: 40 });
  const best = new Map<string, { score: number; snippet: string; chunkId: string }>();
  for (const h of hits) {
    for (const e of h.chunk.experimentIds) {
      const prev = best.get(e);
      if (!prev || h.score > prev.score) best.set(e, { score: h.score, snippet: h.chunk.text.slice(0, 280), chunkId: h.chunk.id });
    }
  }
  return {
    mode,
    results: Array.from(best.entries())
      .map(([experimentId, v]) => ({ experimentId, ...v }))
      .sort((a, b) => b.score - a.score),
  };
}
