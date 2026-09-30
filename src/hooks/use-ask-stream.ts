"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AliasMap } from "@/lib/ai/citations";
import type { MissionId } from "@/lib/schema";

/** Mirrors `AskMeta` from src/lib/ai/answer.ts (server-only), as it arrives over the wire. */
export type AskMetaWire = {
  mode: "ai" | "offline-precomputed" | "offline-retrieval" | "refusal";
  provider?: string;
  modelId?: string;
  aliases: AliasMap;
  confidence: "high" | "medium" | "low" | "none";
  retrieval: { mode: "hybrid" | "lexical"; maxCosine: number | null; passages: number };
  notice?: string;
  missionLabel: string;
};

export type AskDone = { invalid: string[]; flagged: string[]; used: string[] };

export type AskState = {
  status: "idle" | "loading" | "streaming" | "done" | "error";
  question: string;
  text: string;
  meta: AskMetaWire | null;
  done: AskDone | null;
  error: string | null;
};

const IDLE: AskState = { status: "idle", question: "", text: "", meta: null, done: null, error: null };

/**
 * Streams an answer from POST /api/ask (newline-delimited JSON: meta → delta* → done). A new question aborts the
 * previous stream; `stop()` keeps whatever text has arrived.
 */
export function useAskStream() {
  const [state, setState] = useState<AskState>(IDLE);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const ask = useCallback(async (question: string, mission: MissionId, experimentId?: string) => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setState({ ...IDLE, status: "loading", question });
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, mission, experimentId }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `The copilot is unavailable (HTTP ${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line) as
            | ({ type: "meta" } & AskMetaWire)
            | { type: "delta"; text: string }
            | ({ type: "done" } & AskDone)
            | { type: "error"; message: string };
          if (msg.type === "meta") {
            const { type: _t, ...meta } = msg;
            void _t;
            setState((s) => ({ ...s, status: "streaming", meta }));
          } else if (msg.type === "delta") {
            setState((s) => ({ ...s, text: s.text + msg.text }));
          } else if (msg.type === "done") {
            setState((s) => ({ ...s, status: "done", done: { invalid: msg.invalid, flagged: msg.flagged, used: msg.used } }));
          } else if (msg.type === "error") {
            setState((s) => ({ ...s, status: "error", error: msg.message }));
          }
        }
      }
      setState((s) => (s.status === "streaming" || s.status === "loading" ? { ...s, status: "done" } : s));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((s) => ({ ...s, status: "error", error: (err as Error).message || "Something went wrong." }));
    }
  }, []);

  const stop = useCallback(() => {
    controller.current?.abort();
    setState((s) => (s.status === "streaming" || s.status === "loading" ? { ...s, status: "done" } : s));
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    setState(IDLE);
  }, []);

  return { state, ask, stop, reset };
}
