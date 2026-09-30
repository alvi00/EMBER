"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { AnswerBody } from "@/components/ask/AnswerBody";
import { CitationChip } from "@/components/ember/CitationChip";
import type { AliasMap } from "@/lib/ai/citations";
import type { MissionId, PrecomputedAnswer } from "@/lib/schema";
import type { RankedFinding } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type Digest = { text: string; aliases: AliasMap; generatedBy: string; generatedAt: string; mode: "ai" | "precomputed" };

function fromSaved(a: PrecomputedAnswer | undefined): Digest | null {
  if (!a) return null;
  return {
    text: a.answer,
    aliases: Object.fromEntries(a.citations.map((c, i) => [`S${i + 1}`, c])),
    generatedBy: a.generatedBy,
    generatedAt: a.generatedAt,
    mode: "precomputed",
  };
}

const modelName = (by: string) => by.replace(/^[^:]*:/, "").replace(/^.*\//, "");

/**
 * Mission Control evidence digest. Shows the saved AI digest for the mission (works offline); "Write a fresh digest"
 * asks the configured model via /api/summarize. With no saved digest it falls back to the plain-language statements
 * of the top-ranked findings, which need no AI at all.
 */
export function EvidenceDigest({
  missionId,
  saved,
  fallback,
  aiAvailable,
}: {
  missionId: MissionId;
  saved: PrecomputedAnswer | undefined;
  fallback: RankedFinding[];
  aiAvailable: boolean;
}) {
  const [live, setLive] = useState<{ mission: MissionId; digest: Digest } | null>(null);
  const [loading, setLoading] = useState(false);
  // Errors belong to the mission they happened for, so switching missions clears them without an effect.
  const [failure, setFailure] = useState<{ mission: MissionId; message: string } | null>(null);
  const error = failure?.mission === missionId ? failure.message : null;

  const digest = live?.mission === missionId ? live.digest : fromSaved(saved);

  const refresh = async () => {
    setLoading(true);
    setFailure(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mission: missionId }),
      });
      const body = await res.json();
      if (!res.ok || body.mode === "none") throw new Error(body.error ?? "No digest available.");
      setLive({ mission: missionId, digest: body as Digest });
    } catch (err) {
      setFailure({ mission: missionId, message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  if (!digest) {
    return (
      <div className="space-y-3 text-sm leading-relaxed text-ink-muted">
        {fallback.map((r) => (
          <p key={r.finding.id}>
            <span className="text-ink">{r.finding.plainLanguage}</span>{" "}
            <CitationChip
              sourceId={r.finding.evidence[0].sourceId}
              chunkId={r.finding.evidence[0].chunkId}
              page={r.finding.evidence[0].page}
              excerpt={r.finding.evidence[0].excerpt}
            />
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 transition-opacity duration-300", loading && "opacity-50")} aria-busy={loading}>
      <AnswerBody text={digest.text} aliases={digest.aliases} className="text-sm" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-ink-faint">
        <span>
          AI summary of the six top-ranked findings · {modelName(digest.generatedBy)} ·{" "}
          {digest.mode === "ai" ? "just now" : `saved ${new Date(digest.generatedAt).toISOString().slice(0, 10)}`}
        </span>
        {aiAvailable ? (
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-ink-muted transition-colors hover:border-white/25 hover:text-ink disabled:opacity-60"
          >
            <RefreshCw className={cn("size-3", loading && "animate-spin motion-reduce:animate-none")} strokeWidth={1.75} aria-hidden />
            {loading ? "Writing…" : "Write a fresh digest"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
