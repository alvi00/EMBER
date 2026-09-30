"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Cpu, MessagesSquare, WifiOff } from "lucide-react";
import { AnswerView } from "@/components/ask/AnswerView";
import { AskComposer } from "@/components/ask/AskComposer";
import { MissionChip } from "@/components/ember/MissionChip";
import { EmptyState } from "@/components/ember/states";
import { askCopy, SUGGESTED_QUESTIONS } from "@/content/ask";
import { useAskStream, type AskState } from "@/hooks/use-ask-stream";
import { useMission } from "@/hooks/use-mission";
import { getMission } from "@/lib/missions";
import { cn } from "@/lib/utils";

export type AiStatus = { available: boolean; provider: string | null; modelId: string | null };

const STEPS = [
  { title: "Retrieve", body: "Keyword and semantic search over every NASA passage, fused into the eight best matches." },
  { title: "Gate", body: "If no passage is close enough to the question, EMBER declines instead of guessing." },
  { title: "Answer", body: "The model may only use those passages and must cite one after every factual sentence." },
  { title: "Check", body: "Citations that point anywhere else are removed and their sentences flagged." },
];

export function AskClient({ ai }: { ai: AiStatus }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { mission, missionId } = useMission();
  const { state, ask, stop } = useAskStream();
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<AskState[]>([]);
  const answerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const asked = useRef<string | null>(null);
  const busy = state.status === "loading" || state.status === "streaming";

  const run = (question: string, scroll = true) => {
    if (state.status === "done" || state.status === "error") setHistory((h) => [state, ...h].slice(0, 6));
    setDraft("");
    asked.current = question;
    void ask(question, missionId);
    const q = new URLSearchParams(params.toString());
    q.set("q", question);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    if (scroll) requestAnimationFrame(() => answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // Deep links (/ask?q=…) from the floating button, ⌘K and Mission Control ask immediately, once per URL question.
  // `asked` is cleared only on unmount, so a strict-mode/fast-refresh remount (which aborts the request) asks again.
  const fromUrl = params.get("q")?.trim() ?? "";
  useEffect(
    () => () => {
      asked.current = null;
    },
    [],
  );
  useEffect(() => {
    if (fromUrl.length >= 3 && asked.current !== fromUrl) {
      asked.current = fromUrl;
      void ask(fromUrl, missionId);
    }
  }, [fromUrl, missionId, ask]);

  return (
    <div className="container-ember grid gap-10 pb-20 lg:grid-cols-12">
      <section className="min-w-0 lg:col-span-8" aria-label="Ask a question">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-1.5">
          <div className="rounded-[calc(1.75rem-0.375rem)] border border-line bg-elev-1 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <span>Answers framed for</span>
              <MissionChip mission={mission} active />
              <span className="text-ink-faint">Change the mission in the header.</span>
            </div>
            <AskComposer
              id="ask-input"
              ref={inputRef}
              value={draft}
              onChange={setDraft}
              onSubmit={(q) => run(q)}
              onStop={stop}
              busy={busy}
              rows={3}
            />
          </div>
        </div>

        <div ref={answerRef} className="scroll-mt-28 pt-8" aria-live="polite">
          {state.status === "idle" ? (
            <EmptyState
              icon={MessagesSquare}
              title="Ask anything about fire in space"
              body="Pick a suggested question or write your own. Every sentence of the answer links to the NASA passage it came from."
              action={{ label: "Try: Does lunar gravity make materials more flammable?", onClick: () => run(SUGGESTED_QUESTIONS[0].question) }}
            />
          ) : (
            <div>
              <h2 className="mb-4 font-display text-3xl leading-tight text-ink sm:text-4xl">{state.question}</h2>
              <AnswerView state={state} onRetry={() => run(state.question, false)} />
            </div>
          )}
        </div>

        {history.length ? (
          <section className="mt-12 border-t border-line pt-6" aria-labelledby="earlier">
            <h2 id="earlier" className="eyebrow mb-4">
              Earlier in this session
            </h2>
            <div className="divide-y divide-line">
              {history.map((h, i) => (
                <details key={`${h.question}-${i}`} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm text-ink transition-colors hover:text-flame-micro">
                    <span>{h.question}</span>
                    <span aria-hidden className="text-ink-faint transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="pt-4">
                    <AnswerView state={h} compact />
                  </div>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <aside className="space-y-8 lg:col-span-4" aria-label="Suggestions and how answers work">
        <div
          className={cn(
            "flex gap-3 rounded-2xl border p-4 text-sm",
            ai.available ? "border-line bg-elev-1" : "border-flame-micro/30 bg-flame-micro/[0.06]",
          )}
        >
          {ai.available ? (
            <Cpu className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden />
          ) : (
            <WifiOff className="mt-0.5 size-4 shrink-0 text-flame-micro" strokeWidth={1.5} aria-hidden />
          )}
          <div>
            <p className="font-medium text-ink">{ai.available ? "AI model connected" : askCopy.offline}</p>
            <p className="mt-1 text-ink-muted">
              {ai.available
                ? `Answers are written by ${ai.modelId?.replace(/^.*\//, "")} via ${ai.provider}, from retrieved passages only. If the model is unreachable EMBER falls back to offline answers.`
                : askCopy.offlineHelp}
            </p>
          </div>
        </div>

        <div>
          <h2 className="eyebrow mb-3">Suggested questions</h2>
          <ul className="space-y-1.5">
            {SUGGESTED_QUESTIONS.map((s) => (
              <li key={s.question}>
                <button
                  type="button"
                  onClick={() => run(s.question)}
                  disabled={busy}
                  className="group flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink-muted transition-colors duration-200 hover:bg-white/[0.04] hover:text-ink disabled:opacity-50"
                >
                  <span>
                    {s.question}
                    {s.mission !== missionId ? (
                      <span className="mt-0.5 block text-xs text-ink-faint">Written for {getMission(s.mission).short}</span>
                    ) : null}
                  </span>
                  <ArrowUpRight
                    className="mt-0.5 size-4 shrink-0 text-ink-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:text-ink"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow mb-3">How answers are made</h2>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-[11px] text-ink-muted">
                  {i + 1}
                </span>
                <p className="text-ink-muted">
                  <span className="text-ink">{s.title}.</span> {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs leading-relaxed text-ink-faint">
          {askCopy.disclaimer} Framed for {mission.label}.
        </p>
      </aside>
    </div>
  );
}
