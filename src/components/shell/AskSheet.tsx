"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnswerView } from "@/components/ask/AnswerView";
import { AskComposer } from "@/components/ask/AskComposer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SUGGESTED_QUESTIONS } from "@/content/ask";
import { useAskStream } from "@/hooks/use-ask-stream";
import { useMission } from "@/hooks/use-mission";
import { useUiStore } from "@/lib/stores";

/**
 * Mini-ask sheet (project.md §7), loaded on first open by `Overlays`. The answer streams in place with the same
 * citation chips as /ask; "Open in Ask the Flame" continues there.
 */
export function AskSheet() {
  const askOpen = useUiStore((s) => s.askOpen);
  const setAskOpen = useUiStore((s) => s.setAskOpen);
  const { missionId, mission } = useMission();
  const { state, ask, stop, reset } = useAskStream();
  const [question, setQuestion] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = state.status === "loading" || state.status === "streaming";

  // React to the sheet being opened (or re-seeded) from anywhere: ⌘K asks at once, the button just focuses the input.
  // The sheet is mounted by the open that loads it, so that first open is handled once on mount as well.
  const handledFirstOpen = useRef(false);
  useEffect(() => {
    const onOpen = (s: ReturnType<typeof useUiStore.getState>) => {
      if (s.askAuto && s.askSeed) {
        setQuestion("");
        void ask(s.askSeed, missionId);
      } else {
        setQuestion(s.askSeed);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    if (!handledFirstOpen.current) {
      handledFirstOpen.current = true;
      const now = useUiStore.getState();
      if (now.askOpen) queueMicrotask(() => onOpen(now));
    }
    return useUiStore.subscribe((s, prev) => {
      if (!s.askOpen || (prev.askOpen && s.askSeed === prev.askSeed)) return;
      onOpen(s);
    });
  }, [ask, missionId]);

  const submit = (q: string) => {
    setQuestion("");
    void ask(q, missionId);
  };

  const starters = [...SUGGESTED_QUESTIONS.filter((s) => s.mission === missionId), ...SUGGESTED_QUESTIONS.filter((s) => s.mission !== missionId)].slice(0, 3);

  return (
    <>
      <Sheet
        open={askOpen}
        onOpenChange={(open) => {
          setAskOpen(open);
          if (!open) stop();
        }}
      >
        <SheetContent
          side="bottom"
          className="mx-auto flex max-h-[88dvh] max-w-2xl flex-col rounded-t-3xl border-line bg-elev-2 pb-6 md:bottom-6 md:rounded-3xl md:border"
        >
          <SheetHeader className="px-6 pt-6">
            <SheetTitle className="font-display text-3xl font-normal">Ask the Flame</SheetTitle>
            <SheetDescription className="text-ink-muted">
              Answers come only from NASA records, framed for {mission.label}, with citations. Research exploration only.
            </SheetDescription>
          </SheetHeader>

          {state.status !== "idle" ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6" aria-live="polite">
              <p className="mb-3 font-display text-2xl leading-tight text-ink">{state.question}</p>
              <AnswerView state={state} onRetry={() => void ask(state.question, missionId)} compact />
              {state.status === "done" ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <Link
                    href={`/ask?q=${encodeURIComponent(state.question)}&mission=${missionId}`}
                    onClick={() => setAskOpen(false)}
                    className="inline-flex items-center gap-1 text-flame-micro underline-offset-4 hover:underline"
                  >
                    Open in Ask the Flame
                    <ArrowUpRight className="size-3.5" strokeWidth={1.5} aria-hidden />
                  </Link>
                  <button type="button" onClick={reset} className="text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                    Ask something else
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="shrink-0 px-6 pt-2">
            <AskComposer id="mini-ask" ref={inputRef} value={question} onChange={setQuestion} onSubmit={submit} onStop={stop} busy={busy} />
            {state.status === "idle" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {starters.map((s) => (
                  <button
                    key={s.question}
                    type="button"
                    onClick={() => submit(s.question)}
                    className="rounded-full border border-line-strong px-3 py-1.5 text-left text-xs text-ink-muted transition-colors hover:border-flame-micro/50 hover:text-ink"
                  >
                    {s.question}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
