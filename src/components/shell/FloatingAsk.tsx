"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, MessageCircleQuestion } from "lucide-react";
import { AnswerView } from "@/components/ask/AnswerView";
import { AskComposer } from "@/components/ask/AskComposer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SUGGESTED_QUESTIONS } from "@/content/ask";
import { useAskStream } from "@/hooks/use-ask-stream";
import { useMission } from "@/hooks/use-mission";
import { useUiStore } from "@/lib/stores";

/**
 * Floating "Ask" button + mini-ask sheet (project.md §7). The answer streams in place with the same citation chips
 * as /ask; "Open in Ask the Flame" continues there. Hidden on /ask itself.
 */
export function FloatingAsk() {
  const pathname = usePathname();
  const askOpen = useUiStore((s) => s.askOpen);
  const openAsk = useUiStore((s) => s.openAsk);
  const setAskOpen = useUiStore((s) => s.setAskOpen);
  const { missionId, mission } = useMission();
  const { state, ask, stop, reset } = useAskStream();
  const [question, setQuestion] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = state.status === "loading" || state.status === "streaming";

  // React to the sheet being opened (or re-seeded) from anywhere: ⌘K asks at once, the button just focuses the input.
  useEffect(
    () =>
      useUiStore.subscribe((s, prev) => {
        if (!s.askOpen || (prev.askOpen && s.askSeed === prev.askSeed)) return;
        if (s.askAuto && s.askSeed) {
          setQuestion("");
          void ask(s.askSeed, missionId);
        } else {
          setQuestion(s.askSeed);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }),
    [ask, missionId],
  );

  const submit = (q: string) => {
    setQuestion("");
    void ask(q, missionId);
  };

  if (pathname?.startsWith("/ask")) return null;

  const starters = [...SUGGESTED_QUESTIONS.filter((s) => s.mission === missionId), ...SUGGESTED_QUESTIONS.filter((s) => s.mission !== missionId)].slice(0, 3);

  return (
    <>
      <button
        type="button"
        onClick={() => openAsk()}
        className="group fixed right-4 bottom-4 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-elev-2/85 pr-5 pl-2 text-sm text-ink shadow-[0_12px_40px_-12px_rgba(123,97,255,0.45)] backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] md:right-6 md:bottom-6"
        aria-label="Ask the Flame"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-flame-violet/20 text-flame-violet-text">
          <MessageCircleQuestion className="size-4" strokeWidth={1.5} aria-hidden />
        </span>
        Ask
      </button>

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
