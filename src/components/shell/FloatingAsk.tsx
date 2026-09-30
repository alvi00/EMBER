"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, MessageCircleQuestion } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useUiStore } from "@/lib/stores";
import { cn } from "@/lib/utils";

const STARTERS = [
  "Does lunar gravity make materials more flammable?",
  "Does turning off ventilation put out a fire in microgravity?",
  "What happens to smoke detection in a small spacecraft?",
];

/**
 * Floating "Ask" button + mini-ask sheet. Questions are handed to /ask, which streams a cited answer
 * (or answers offline from precomputed results).
 */
export function FloatingAsk() {
  const pathname = usePathname();
  const router = useRouter();
  const { askOpen, askSeed, openAsk, setAskOpen } = useUiStore();
  const [question, setQuestion] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (askOpen) {
      setQuestion(askSeed);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [askOpen, askSeed]);

  const submit = (q: string) => {
    const text = q.trim();
    if (!text) return;
    setAskOpen(false);
    router.push(`/ask?q=${encodeURIComponent(text)}`);
  };

  if (pathname?.startsWith("/ask")) return null;

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

      <Sheet open={askOpen} onOpenChange={setAskOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-2xl rounded-t-3xl border-line bg-elev-2 pb-8 md:bottom-6 md:rounded-3xl md:border">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle className="font-display text-3xl font-normal">Ask the Flame</SheetTitle>
            <SheetDescription className="text-ink-muted">
              Answers come only from the NASA evidence base, with citations. Research exploration only.
            </SheetDescription>
          </SheetHeader>
          <form
            className="px-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit(question);
            }}
          >
            <label htmlFor="mini-ask" className="sr-only">
              Your question
            </label>
            <div className="flex items-end gap-2 rounded-2xl border border-line-strong bg-elev-1 p-2 focus-within:border-flame-micro/60">
              <textarea
                id="mini-ask"
                ref={inputRef}
                rows={2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(question);
                  }
                }}
                placeholder="e.g. How does oxygen level change flame spread?"
                className="min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
              />
              <button
                type="submit"
                disabled={!question.trim()}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-canvas transition-opacity",
                  !question.trim() && "opacity-40",
                )}
                aria-label="Ask"
              >
                <ArrowUp className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          </form>
          <div className="flex flex-wrap gap-2 px-6">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                className="rounded-full border border-line-strong px-3 py-1.5 text-left text-xs text-ink-muted transition-colors hover:border-flame-micro/50 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
