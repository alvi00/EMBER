import "server-only";
import { streamText } from "ai";
import { getExperiment, getSource } from "@/lib/data";
import { shortSourceLabel } from "@/lib/catalog";
import { cosine, embed } from "@/lib/embeddings";
import { getMission } from "@/lib/missions";
import type { MissionId, PrecomputedAnswer } from "@/lib/schema";
import { hybridSearch, type Hit } from "@/lib/search";
import type { AliasMap } from "@/lib/ai/citations";
import { answerInstructions, answerPrompt, type PromptPassage } from "@/lib/ai/prompts";
import { getModel, providerOptions, providerStatus } from "@/lib/ai/provider";
import { loadPrecomputed } from "@/lib/ai/precomputed";
import { PRECOMPUTED_MATCH, RELEVANCE_GATE } from "@/lib/ai/constants";

/**
 * Ask the Flame answer engine (project.md §10). Retrieval first; a relevance gate refuses questions the dataset
 * cannot support; then either the configured LLM (streamed) or an offline path (precomputed answer when the question
 * matches one with cosine ≥ 0.8, otherwise retrieval-only passages).
 */

export { RELEVANCE_GATE, PRECOMPUTED_MATCH };

export type AskMode = "ai" | "offline-precomputed" | "offline-retrieval" | "refusal";

export type AskMeta = {
  mode: AskMode;
  provider?: string;
  modelId?: string;
  aliases: AliasMap;
  confidence: "high" | "medium" | "low" | "none";
  retrieval: { mode: "hybrid" | "lexical"; maxCosine: number | null; passages: number };
  notice?: string;
  missionLabel: string;
};

function labelFor(hit: Hit): string {
  const s = getSource(hit.chunk.sourceId);
  const base = s ? shortSourceLabel(s) : hit.chunk.sourceId;
  return `${base}${hit.chunk.page ? ` · p.${hit.chunk.page}` : ""}`;
}

function confidenceFrom(maxCos: number | null, hits: Hit[]): AskMeta["confidence"] {
  if (maxCos === null) return hits.length >= 3 ? "medium" : "low";
  const sources = new Set(hits.map((h) => h.chunk.sourceId)).size;
  if (maxCos >= 0.65 && sources >= 2) return "high";
  if (maxCos >= 0.55) return "medium";
  return "low";
}

let questionVectors: Promise<number[][] | null> | null = null;

/** Embeddings of the precomputed questions, computed once per server process. */
function precomputedVectors(answers: PrecomputedAnswer[]): Promise<number[][] | null> {
  if (!questionVectors) {
    questionVectors = answers.length ? embed(answers.map((a) => a.question)).catch(() => null) : Promise.resolve([]);
  }
  return questionVectors;
}

/**
 * Find a precomputed answer for this question. Exact text wins; otherwise the nearest question by embedding with
 * cosine ≥ 0.8. Answers written for the current mission are preferred over the same question for another mission.
 */
export async function matchPrecomputed(question: string, missionId: MissionId, queryVector?: number[]) {
  const answers = loadPrecomputed();
  const candidates = answers.map((a, i) => ({ a, i })).filter(({ a }) => a.kind === "suggested");
  const prefer = (list: typeof candidates) => list.find(({ a }) => !a.mission || a.mission === missionId) ?? list[0];
  const qNorm = question.trim().toLowerCase();
  const exact = prefer(candidates.filter(({ a }) => a.question.trim().toLowerCase() === qNorm));
  if (exact) return { answer: exact.a, similarity: 1 };
  const vectors = queryVector ? await precomputedVectors(answers) : null;
  if (!vectors || !queryVector) return null;
  const scored = candidates
    .map(({ a, i }) => ({ a, sim: cosine(queryVector, vectors[i]) }))
    .filter((c) => c.sim >= PRECOMPUTED_MATCH)
    .sort((x, y) => y.sim - x.sim || Number(y.a.mission === missionId) - Number(x.a.mission === missionId));
  if (!scored.length) return null;
  const top = scored.filter((c) => c.sim >= scored[0].sim - 0.02);
  const best = top.find((c) => !c.a.mission || c.a.mission === missionId) ?? top[0];
  return { answer: best.a, similarity: best.sim };
}

function aliasMapFromHits(hits: Hit[]): AliasMap {
  const map: AliasMap = {};
  hits.forEach((h, i) => {
    map[`S${i + 1}`] = { chunkId: h.chunk.id, sourceId: h.chunk.sourceId, page: h.chunk.page, label: labelFor(h) };
  });
  return map;
}

function aliasMapFromPrecomputed(a: PrecomputedAnswer): AliasMap {
  const map: AliasMap = {};
  a.citations.forEach((c, i) => {
    map[`S${i + 1}`] = { chunkId: c.chunkId, sourceId: c.sourceId, page: c.page, label: c.label, excerpt: c.excerpt };
  });
  return map;
}

async function* chunked(text: string, size = 24): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
    await new Promise((r) => setTimeout(r, 8));
  }
}

function retrievalOnlyText(hits: Hit[], missionLabel: string): string {
  const lines = hits.slice(0, 5).map((h, i) => {
    const words = h.chunk.text.split(/\s+/).slice(0, 34).join(" ");
    return `- ${words}… [[S${i + 1}]]`;
  });
  return [
    "### What the evidence shows",
    "Offline mode: no AI model is connected, so here are the most relevant NASA passages for your question, verbatim. Open a citation to read it in context.",
    "",
    ...lines,
    "",
    `### What it means for ${missionLabel}`,
    "Read the cited passages for their implications; EMBER does not summarise without a model connected.",
    "",
    "### Not covered by the data",
    "Anything not stated in these passages.",
  ].join("\n");
}

function refusalText(hits: Hit[]): string {
  const topics = Array.from(new Set(hits.flatMap((h) => h.chunk.experimentIds)))
    .map((id) => getExperiment(id))
    .filter((e) => e !== undefined)
    .slice(0, 3)
    .map((e) => `${e.acronym}: ${e.fullName}`);
  return [
    "### What the evidence shows",
    "The dataset does not cover this. EMBER only answers from NASA microgravity combustion records, and none of them address this question closely enough to answer it honestly.",
    "",
    "### Not covered by the data",
    "This question falls outside the records EMBER holds: spacecraft fire experiments on flame spread, flammability limits, droplet and gas-jet flames, smoke and suppression.",
    ...(topics.length ? ["", "Nearest experiments in the archive, in case they help:", ...topics.map((t) => `- ${t}`)] : []),
  ].join("\n");
}

export async function answerQuestion(
  question: string,
  missionId: MissionId,
  opts: { experimentId?: string; forceOffline?: boolean } = {},
): Promise<{ meta: AskMeta; stream: AsyncIterable<string>; finished: Promise<string> }> {
  const mission = getMission(missionId);
  const { hits, mode: retrievalMode, queryVector } = await hybridSearch(question, { k: 8, experimentId: opts.experimentId });
  const cosines = hits.map((h) => h.cosine).filter((c): c is number => typeof c === "number");
  const maxCos = retrievalMode === "hybrid" ? (cosines.length ? Math.max(...cosines) : 0) : null;
  const base = {
    retrieval: { mode: retrievalMode, maxCosine: maxCos, passages: hits.length },
    missionLabel: mission.label,
  };

  const collect = (it: AsyncIterable<string>) => {
    let full = "";
    let resolve!: (s: string) => void;
    const finished = new Promise<string>((r) => (resolve = r));
    const stream = (async function* () {
      for await (const part of it) {
        full += part;
        yield part;
      }
      resolve(full);
    })();
    return { stream, finished };
  };

  // Relevance gate: weak retrieval → graceful refusal, never a guess.
  if (!hits.length || (maxCos !== null && maxCos < RELEVANCE_GATE)) {
    const text = refusalText(hits);
    return { meta: { ...base, mode: "refusal", aliases: {}, confidence: "none" }, ...collect(chunked(text)) };
  }

  const resolved = opts.forceOffline ? null : await getModel();
  if (resolved) {
    const aliases = aliasMapFromHits(hits);
    const passages: PromptPassage[] = hits.map((h, i) => ({ alias: `S${i + 1}`, label: labelFor(h), text: h.chunk.text }));
    try {
      const result = streamText({
        model: resolved.model,
        instructions: answerInstructions(mission.label),
        prompt: answerPrompt(question, passages, mission.label),
        temperature: 0.2,
        maxOutputTokens: 1200,
        maxRetries: 1,
        providerOptions: providerOptions(resolved.provider, resolved.modelId),
        // Failures surface at the first token below, which logs one line and falls back offline; skip the SDK's
        // default full-stack console error.
        onError: () => {},
      });
      // Pull the first token before committing to AI mode, so provider/network failures fall back cleanly.
      const iterator = result.textStream[Symbol.asyncIterator]();
      const first = await iterator.next();
      if (first.done) throw new Error("Empty model response");
      const rest = (async function* () {
        yield first.value;
        while (true) {
          const n = await iterator.next();
          if (n.done) return;
          yield n.value;
        }
      })();
      return {
        meta: {
          ...base,
          mode: "ai",
          provider: resolved.provider,
          modelId: resolved.modelId,
          aliases,
          confidence: confidenceFrom(maxCos, hits),
        },
        ...collect(rest),
      };
    } catch (err) {
      console.warn("EMBER ask: model call failed, falling back to offline mode.", (err as Error).message);
    }
  }

  // Offline: precomputed answer if the question matches one, else retrieval-only passages.
  const status = providerStatus();
  const notice = status.available && !opts.forceOffline ? "The AI provider did not respond, so EMBER answered offline." : undefined;
  const match = await matchPrecomputed(question, missionId, queryVector);
  if (match) {
    const a = match.answer;
    const otherMission = a.mission && a.mission !== missionId ? getMission(a.mission).label : null;
    const savedNotice = otherMission ? `This saved answer was written for ${otherMission}.` : undefined;
    return {
      meta: {
        ...base,
        mode: "offline-precomputed",
        aliases: aliasMapFromPrecomputed(a),
        confidence: a.confidence,
        notice: [notice, savedNotice].filter(Boolean).join(" ") || undefined,
        provider: a.generatedBy,
      },
      ...collect(chunked(a.answer)),
    };
  }
  const aliases = aliasMapFromHits(hits.slice(0, 5));
  return {
    meta: { ...base, mode: "offline-retrieval", aliases, confidence: confidenceFrom(maxCos, hits), notice },
    ...collect(chunked(retrievalOnlyText(hits, mission.label), 48)),
  };
}
