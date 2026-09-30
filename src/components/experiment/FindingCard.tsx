import { CategoryBadge, ConfidenceBadge, SeverityMeter, StatusBadge } from "@/components/ember/badges";
import { CitationChip } from "@/components/ember/CitationChip";
import { MISSIONS } from "@/lib/missions";
import type { Finding } from "@/lib/schema";
import { cn } from "@/lib/utils";

/** A finding with its evidence, badges and per-mission relevance (0-3), all traceable to cited passages. */
export function FindingCard({ finding, className }: { finding: Finding; className?: string }) {
  return (
    <article id={finding.id} aria-labelledby={`${finding.id}-t`} className={cn("scroll-mt-28 rounded-2xl border border-line bg-elev-1 p-5 md:p-6", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <CategoryBadge category={finding.category} />
        <StatusBadge status={finding.status} reviewer={finding.reviewer} />
        <ConfidenceBadge confidence={finding.confidence} />
      </div>
      <h3 id={`${finding.id}-t`} className="mt-4 text-base leading-relaxed font-medium text-ink">
        {finding.statement}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{finding.plainLanguage}</p>
      <p className="mt-3 text-sm leading-relaxed">
        <span className="text-ink-muted">Safety implication: </span>
        <span className="text-ink">{finding.safetyImplication}</span>
      </p>

      <div className="mt-5 space-y-2">
        {finding.evidence.map((ev, i) => (
          <blockquote key={`${ev.chunkId}-${i}`} className="border-l-2 border-flame-micro/40 pl-3 text-sm text-ink-muted">
            <p>“{ev.excerpt}”</p>
            <footer className="mt-1.5">
              <CitationChip sourceId={ev.sourceId} chunkId={ev.chunkId} page={ev.page} excerpt={ev.excerpt} />
            </footer>
          </blockquote>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4">
        <dl className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Mission relevance, 0 to 3">
          {MISSIONS.map((m) => {
            const v = finding.missionRelevance[m.id];
            return (
              <div key={m.id} className="text-xs">
                <dt className="text-ink-muted">{m.short}</dt>
                <dd className="mt-1 flex items-center gap-1" aria-label={`${v} of 3`}>
                  {[1, 2, 3].map((i) => (
                    <span key={i} aria-hidden className={cn("h-1.5 w-4 rounded-full", i <= v ? "bg-flame-micro" : "bg-elev-3")} />
                  ))}
                </dd>
              </div>
            );
          })}
        </dl>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <SeverityMeter value={finding.severity} />
          <SeverityMeter value={finding.actionability} label="Actionability" />
          <SeverityMeter value={finding.evidenceStrength} label="Evidence" />
        </div>
      </div>
    </article>
  );
}
