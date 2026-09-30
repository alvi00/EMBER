import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { assertDevOnly } from "@/lib/dev-only";
import type { Chunk, Experiment, Finding, Source } from "@/lib/schema";
import { ReviewClient, type ReviewItem } from "@/components/review/ReviewClient";

export const metadata: Metadata = {
  title: "Finding review",
  robots: { index: false, follow: false },
};

// Always read the latest findings.json from disk so decisions show up immediately.
export const dynamic = "force-dynamic";

async function readData<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(path.join(process.cwd(), "data", file), "utf8")) as T;
}

export default async function ReviewPage() {
  assertDevOnly();
  const [findings, chunks, sources, experiments] = await Promise.all([
    readData<Finding[]>("processed/findings.json"),
    readData<Chunk[]>("processed/chunks.json"),
    readData<Source[]>("sources.json"),
    readData<Experiment[]>("processed/experiments.json"),
  ]);
  const chunkById = new Map(chunks.map((c) => [c.id, c]));
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const expById = new Map(experiments.map((e) => [e.id, e]));

  const items: ReviewItem[] = findings.map((f) => ({
    finding: f,
    experiment: { id: f.experimentId, acronym: expById.get(f.experimentId)?.acronym ?? f.experimentId },
    evidence: f.evidence.map((ev) => {
      const s = sourceById.get(ev.sourceId);
      return {
        ...ev,
        chunkText: chunkById.get(ev.chunkId)?.text ?? "",
        sourceTitle: s?.title ?? ev.sourceId,
        sourceUrl: s?.url ?? "#",
      };
    }),
  }));

  return (
    <div className="container-ember py-10">
      <p className="eyebrow">Dev only · Human verification</p>
      <h1 className="font-display mt-3 text-5xl leading-tight">Finding review</h1>
      <p className="text-ink-muted mt-3 max-w-2xl">
        Every finding was drafted from the source text and is marked <strong>AI draft</strong> until a person checks it
        against the highlighted excerpt. Your decision is written to <code>data/processed/findings.json</code>.
      </p>
      <ReviewClient items={items} />
    </div>
  );
}
