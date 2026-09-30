"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MessageCircleQuestion } from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { FlameStage } from "@/components/three/FlameStage";
import { flameState } from "@/components/three/flame-state";
import { CitationChip } from "@/components/ember/CitationChip";
import { StatusBadge } from "@/components/ember/badges";
import { ShineBorder } from "@/components/magicui/shine-border";
import type { EvidenceRef } from "@/lib/evidence";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type StoryStep = {
  id: string;
  gravity: number;
  gravityLabel: string;
  title: string;
  body: string;
  evidence: EvidenceRef[];
};

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

export function HeroStory({ steps }: { steps: StoryStep[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          const { motion } = ctx.conditions as { motion: boolean };

          // Scroll story: gravity follows the steps (Earth → orbit → Moon). Scrubbed when motion is allowed,
          // snapped per step otherwise.
          const proxy = { g: 1 };
          const stepEls = gsap.utils.toArray<HTMLElement>("[data-step]");
          if (motion && stepEls.length) {
            const tl = gsap.timeline({
              scrollTrigger: {
                trigger: "[data-steps]",
                start: "top 65%",
                end: "bottom 60%",
                scrub: 0.6,
              },
              onUpdate: () => flameState.setTarget(proxy.g),
            });
            // Each step occupies one unit of the timeline and its centre sits at i + 0.5; transitions happen
            // between steps (i - 0.3 → i + 0.3) so the flame holds its state while a step is being read.
            tl.to({}, { duration: steps.length }, 0);
            steps.forEach((s, i) => {
              if (i === 0) return;
              tl.to(proxy, { g: s.gravity, duration: 0.6, ease: "power2.inOut" }, i - 0.3);
            });
          }
          stepEls.forEach((el, i) => {
            ScrollTrigger.create({
              trigger: el,
              start: "top 60%",
              end: "bottom 40%",
              onToggle: (self) => {
                if (self.isActive) {
                  setActive(i);
                  if (!motion) flameState.setTarget(steps[i].gravity);
                }
              },
            });
          });
        },
      );

      const refresh = () => ScrollTrigger.refresh();
      document.fonts?.ready.then(refresh).catch(() => undefined);
      return () => mm.revert();
    },
    { scope: root, dependencies: [steps] },
  );

  return (
    <div ref={root} className="container-ember grid grid-cols-1 gap-x-10 lg:grid-cols-12">
      {/* Hero copy */}
      <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col justify-center pt-10 pb-6 lg:col-span-7 lg:col-start-1 lg:row-start-1 lg:pt-0">
        <h1 className="font-display text-[3.1rem] leading-[1.04] tracking-tight text-ink sm:text-6xl lg:text-[3.6rem] xl:text-[4.1rem]">
          <span className="hero-rise block">On Earth, fire rises.</span>
          <em className="hero-rise text-flame-gradient block pr-1 pb-1 [animation-delay:120ms]">
            In space, it has nowhere to go.
          </em>
        </h1>
        <p className="hero-rise mt-6 [animation-delay:240ms] max-w-[46ch] text-lg leading-relaxed text-ink-muted">
          EMBER turns decades of NASA microgravity combustion research into ranked, source-linked fire-safety insights
          for the Moon and Mars.
        </p>
        <div className="hero-rise mt-9 flex [animation-delay:340ms] flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className={cn(
              "group relative inline-flex min-h-12 items-center gap-3 overflow-hidden rounded-full bg-ink py-1.5 pr-1.5 pl-6 text-sm font-medium text-canvas transition-[transform,background-color] duration-300 hover:bg-white active:scale-[0.98]",
              EASE,
            )}
          >
            <ShineBorder shineColor={["#4CC9F0", "#7B61FF", "#FF7A18"]} borderWidth={2} duration={10} />
            Open Mission Control
            <span
              aria-hidden
              className={cn(
                "flex size-9 items-center justify-center rounded-full bg-canvas/10 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px",
                EASE,
              )}
            >
              <ArrowUpRight className="size-4" strokeWidth={1.5} />
            </span>
          </Link>
          <Link
            href="/ask"
            className={cn(
              "group inline-flex min-h-12 items-center gap-2.5 rounded-full border border-line-strong bg-white/[0.03] py-1.5 pr-5 pl-2 text-sm text-ink transition-[transform,background-color] duration-300 hover:bg-white/[0.07] active:scale-[0.98]",
              EASE,
            )}
          >
            <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-flame-violet/20 text-flame-violet-text">
              <MessageCircleQuestion className="size-4" strokeWidth={1.5} />
            </span>
            Ask the Flame
          </Link>
        </div>
      </div>

      {/* Flame: sticky through the hero and the three steps on large screens */}
      <div className="relative lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
        <div className="h-[72dvh] min-h-[440px] lg:sticky lg:top-[5.5rem] lg:h-[calc(100dvh-10rem)]">
          <FlameStage className="h-full" initialGravity={1} />
        </div>
      </div>

      {/* Why it's different */}
      <div data-steps className="pb-10 lg:col-span-6 lg:col-start-1 lg:row-start-2">
        <h2 className="sr-only">Why fire is different in space</h2>
        {steps.map((s, i) => (
          <article
            key={s.id}
            data-step
            aria-labelledby={`step-${s.id}`}
            className={cn(
              "flex min-h-[70vh] flex-col justify-center border-l py-12 pl-6 transition-[border-color,opacity] duration-500 md:pl-8",
              active === i ? "border-flame-micro/70" : "border-line",
              active !== -1 && active !== i ? "lg:opacity-45" : "opacity-100",
            )}
          >
            <p className="font-mono text-xs text-ink-muted tabular">{s.gravityLabel}</p>
            <h3 id={`step-${s.id}`} className="mt-3 max-w-[18ch] font-display text-4xl leading-[1.05] text-ink md:text-5xl">
              {s.title}
            </h3>
            <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-ink-muted md:text-lg">{s.body}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {s.evidence.map((ev) => (
                <CitationChip key={ev.chunkId} sourceId={ev.sourceId} chunkId={ev.chunkId} page={ev.page} excerpt={ev.excerpt} />
              ))}
              {s.evidence.some((ev) => ev.status === "ai-draft") ? <StatusBadge status="ai-draft" /> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
