"use client";

import { useEffect, useRef, useState } from "react";
import { Database, FileSearch, Gauge, UserCheck, UserRound } from "lucide-react";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { cn } from "@/lib/utils";
import { SplitHeading } from "@/components/story/SplitHeading";

export type PipelineNode = { title: string; detail: string };

const ICONS = [Database, FileSearch, UserCheck, Gauge, UserRound];

/** "How EMBER works": NASA sources → extraction → human verification → ranking → you. */
export function PipelineSection({ nodes }: { nodes: PipelineNode[] }) {
  const container = useRef<HTMLDivElement>(null);
  const refs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];
  // Beams are decorative and client-only: render them after mount, and never with reduced motion.
  const [showBeams, setShowBeams] = useState(false);
  useEffect(() => {
    setShowBeams(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <section aria-labelledby="pipeline-title" className="py-24 md:py-32">
      <div className="container-ember">
        <p className="eyebrow">How EMBER works</p>
        <SplitHeading id="pipeline-title" className="mt-4 max-w-[20ch] font-display text-5xl leading-[1.03] text-ink md:text-6xl">
          From NASA archive to a decision you can trace.
        </SplitHeading>

        <div
          ref={container}
          className="relative mt-16 flex flex-col gap-10 md:flex-row md:items-stretch md:justify-between md:gap-4"
        >
          {nodes.map((n, i) => {
            const Icon = ICONS[i] ?? Database;
            return (
              <div key={n.title} className="relative z-10 flex items-start gap-4 md:w-44 md:flex-col md:items-center md:text-center">
                <div
                  ref={refs[i]}
                  className={cn(
                    "flex size-16 shrink-0 items-center justify-center rounded-2xl border bg-elev-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]",
                    i === 2 ? "border-flame-violet/40 text-flame-violet-text" : "border-line-strong text-ink",
                  )}
                >
                  <Icon className="size-6" strokeWidth={1.5} aria-hidden />
                </div>
                <div>
                  <p className="text-base font-medium text-ink">{n.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{n.detail}</p>
                </div>
              </div>
            );
          })}
          {showBeams
            ? refs.slice(0, -1).map((from, i) => (
                <AnimatedBeam
                  key={i}
                  containerRef={container}
                  fromRef={from}
                  toRef={refs[i + 1]}
                  curvature={0}
                  duration={4}
                  delay={i * 0.4}
                  pathColor="rgba(255,255,255,0.18)"
                  pathOpacity={0.6}
                  gradientStartColor="#4CC9F0"
                  gradientStopColor="#7B61FF"
                />
              ))
            : null}
        </div>
      </div>
    </section>
  );
}
