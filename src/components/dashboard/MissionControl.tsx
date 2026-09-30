"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarRange, Grid3x3, ListOrdered, NotebookText, PieChart } from "lucide-react";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import { CategoryBadge, StatusBadge } from "@/components/ember/badges";
import { CitationChip } from "@/components/ember/CitationChip";
import { Ticker } from "@/components/ember/Ticker";
import { EmptyState } from "@/components/ember/states";
import { CoverageHeatmap } from "@/components/charts/CoverageHeatmap";
import { ExperimentTimeline } from "@/components/charts/ExperimentTimeline";
import { CategoryBars, type CategoryDatum } from "@/components/charts/CategoryBars";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useMission } from "@/hooks/use-mission";
import { gravityRowFor, o2BinFor, type CoverageCell } from "@/lib/coverage-grid";
import type { TimelineRow } from "@/lib/dashboard";
import type { Finding, FindingCategory } from "@/lib/schema";
import { rankFindings } from "@/lib/scoring";
import { truncate } from "@/lib/text";
import { cn } from "@/lib/utils";

export type MissionControlProps = {
  findings: Finding[];
  timeline: TimelineRow[];
  coverage: CoverageCell[];
  unplaced: number;
  stats: { investigations: number; flight: number; ground: number; sources: number; testPoints: number };
};

const CATEGORIES: FindingCategory[] = [
  "ignition",
  "flame-spread",
  "extinction",
  "suppression",
  "smoke-detection",
  "materials",
  "cool-flames",
  "scale-effects",
];

export function MissionControl({ findings, timeline, coverage, unplaced, stats }: MissionControlProps) {
  const { mission, missionId } = useMission();
  const { experimentById } = useCatalog();

  const ranked = useMemo(() => rankFindings(findings, missionId), [findings, missionId]);
  const relevant = useMemo(() => findings.filter((f) => f.missionRelevance[missionId] >= 2), [findings, missionId]);
  const verified = findings.filter((f) => f.status === "verified").length;
  const missionRow = gravityRowFor(mission.gravityG);
  const pointsAtGravity = coverage.filter((c) => c.row === missionRow.id).reduce((a, c) => a + c.count, 0);
  const missionCell = { row: missionRow.id, col: o2BinFor(mission.cabin.o2Percent).id };
  const highlight = useMemo(() => new Set(relevant.map((f) => f.experimentId)), [relevant]);
  const categoryData: CategoryDatum[] = CATEGORIES.map((c) => ({
    category: c,
    count: relevant.filter((f) => f.category === c).length,
    total: findings.filter((f) => f.category === c).length,
  })).filter((d) => d.total > 0);
  const top = ranked.slice(0, 5);
  const digest = ranked.slice(0, 4);
  const label = (id: string) => experimentById.get(id)?.acronym ?? id;

  const kpis = [
    { value: relevant.length, label: `Findings relevant to ${mission.short}`, note: `of ${findings.length} total` },
    { value: pointsAtGravity, label: `Test points at ${missionRow.label}`, note: `of ${stats.testPoints} measurements` },
    { value: stats.investigations, label: "Investigations", note: `${stats.flight} flight, ${stats.ground} ground` },
    { value: stats.sources, label: "NASA sources", note: "PSI + NTRS" },
    { value: verified, label: "Human-verified", note: `of ${findings.length} findings` },
  ];

  return (
    <div className="container-ember pb-16">
      <p className="mb-6 max-w-3xl text-sm text-ink-muted">
        Ranking for <span className="text-ink">{mission.label}</span> ({mission.gravityLabel}). Cabin{" "}
        <span className="font-mono text-ink tabular">
          {mission.cabin.pressureKpa} kPa, {mission.cabin.o2Percent}% O2
        </span>{" "}
        ({mission.cabin.sourced ? "NASA source" : "assumed"}). Change the mission in the header; every tile updates.
      </p>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.25rem] border border-line bg-line sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k, i) => (
          <div key={k.label} className={cn("bg-elev-1 p-5", i === 4 && "col-span-2 sm:col-span-1")}>
            <dt className="text-xs text-ink-muted">{k.label}</dt>
            <dd className="mt-2">
              <Ticker value={k.value} className={cn("text-3xl font-medium", i === 0 ? "text-flame-core" : "text-ink")} />
              <span className="mt-1 block text-xs text-ink-muted">{k.note}</span>
            </dd>
          </div>
        ))}
      </dl>

      <BentoGrid className="mt-4">
        <BentoCard
          name={`Top 5 insights for ${mission.label}`}
          Icon={ListOrdered}
          description="Insight Score with default weights. AI drafts are scored × 0.7 until a human verifies them."
          href={`/insights?mission=${missionId}`}
          cta="Open ranked insights and adjust weights"
          className="md:col-span-6 xl:col-span-7 xl:row-span-2"
        >
          {top.length ? (
            <ol className="-mx-2 space-y-1">
              {top.map((r) => (
                <li key={r.finding.id}>
                  <div className="group/row flex gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-white/[0.03]">
                    <span className="w-6 shrink-0 pt-0.5 font-mono text-sm text-ink-muted tabular">{r.rank}</span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/insights?mission=${missionId}#${r.finding.id}`}
                        className="text-sm leading-relaxed text-ink hover:underline"
                      >
                        {truncate(r.finding.statement, 190)}
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <CategoryBadge category={r.finding.category} />
                        <StatusBadge status={r.finding.status} reviewer={r.finding.reviewer} />
                        <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted">
                          {label(r.finding.experimentId)}
                        </span>
                        <CitationChip
                          sourceId={r.finding.evidence[0].sourceId}
                          chunkId={r.finding.evidence[0].chunkId}
                          page={r.finding.evidence[0].page}
                          excerpt={r.finding.evidence[0].excerpt}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-mono text-xl text-flame-core tabular">{Math.round(r.score)}</span>
                      <span className="block text-[10px] text-ink-muted">score</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No findings yet" body="Run the extraction pipeline to populate findings." />
          )}
        </BentoCard>

        <BentoCard
          name="Evidence digest"
          Icon={NotebookText}
          description="Offline summary assembled from the four top-ranked findings (no AI). Each sentence cites its source."
          href={`/ask?q=${encodeURIComponent(`What does the evidence say about fire safety for ${mission.label}?`)}`}
          cta="Ask the Flame for a fuller answer"
          className="md:col-span-6 xl:col-span-5"
        >
          <div className="space-y-3 text-sm leading-relaxed text-ink-muted">
            {digest.map((r) => (
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
        </BentoCard>

        <BentoCard
          name="Evidence coverage"
          Icon={Grid3x3}
          description={`Test points by gravity and oxygen. ${unplaced} points without an O2 value are not placed.`}
          href={`/lens?mission=${missionId}`}
          cta="Check your cabin in the Risk Lens"
          className="md:col-span-6 xl:col-span-5"
        >
          <CoverageHeatmap cells={coverage} missionCell={missionCell} experimentLabel={label} compact />
        </BentoCard>

        <BentoCard
          name="Investigations over time"
          Icon={CalendarRange}
          description={`Grouped by platform. Faded rows have no findings rated relevant to ${mission.short}.`}
          href="/experiments"
          cta="Browse all experiments"
          className="md:col-span-6 xl:col-span-8"
        >
          <ExperimentTimeline rows={timeline} highlight={highlight} />
        </BentoCard>

        <BentoCard
          name="Findings by category"
          Icon={PieChart}
          description={`Findings ${mission.short} rates relevant (≥ 2 of 3).`}
          href={`/insights?mission=${missionId}`}
          cta="Filter insights by category"
          className="md:col-span-6 xl:col-span-4"
        >
          <CategoryBars data={categoryData} />
        </BentoCard>
      </BentoGrid>
    </div>
  );
}
