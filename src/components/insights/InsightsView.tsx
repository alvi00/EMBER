"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { FileDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { BorderBeam } from "@/components/magicui/border-beam";
import { CATEGORY_META, CategoryBadge, ConfidenceBadge, StatusBadge } from "@/components/ember/badges";
import { CitationChip } from "@/components/ember/CitationChip";
import { EmptyState } from "@/components/ember/states";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useMission } from "@/hooks/use-mission";
import type { Finding, FindingCategory } from "@/lib/schema";
import {
  DEFAULT_WEIGHTS,
  DRAFT_PENALTY,
  WEIGHT_LABELS,
  rankFindings,
  resolveWeights,
  type RankedFinding,
  type Weights,
} from "@/lib/scoring";
import { cn } from "@/lib/utils";

/** Score-breakdown colours: validated 4-slot categorical set (dataviz validator, dark, popover surface). */
const PART_COLOR: Record<keyof Weights, string> = { sev: "#d95926", app: "#3987e5", evd: "#c98500", act: "#199e70" };
const PART_ORDER: (keyof Weights)[] = ["sev", "app", "evd", "act"];

function parseWeights(v: string | null): Weights | null {
  if (!v) return null;
  const [sev, app, evd, act] = v.split("-").map((x) => Number(x) / 100);
  return resolveWeights({ sev, app, evd, act });
}

function BreakdownPopover({ r, mission }: { r: RankedFinding; mission: string }) {
  const b = r.breakdown;
  return (
    <Popover>
      <PopoverTrigger className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink-muted transition-colors hover:text-ink">
        How is this scored?
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 border-line bg-elev-2 p-4 text-sm">
        <p className="font-medium text-ink">Score breakdown</p>
        <div className="mt-3 flex h-3 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
          {PART_ORDER.map((k) =>
            b.parts[k] > 0 ? <span key={k} style={{ width: `${b.parts[k]}%`, background: PART_COLOR[k] }} /> : null,
          )}
          <span className="flex-1 bg-elev-3" />
        </div>
        <ul className="mt-3 space-y-1.5 text-xs">
          {PART_ORDER.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: PART_COLOR[k] }} />
              <span className="flex-1 text-ink-muted">{WEIGHT_LABELS[k]}</span>
              <span className="font-mono text-ink tabular">{b.parts[k].toFixed(1)}</span>
            </li>
          ))}
          <li className="flex items-center gap-2 border-t border-line pt-1.5">
            <span className="flex-1 text-ink-muted">Sum</span>
            <span className="font-mono text-ink tabular">{b.raw.toFixed(1)}</span>
          </li>
          {b.penalty < 1 ? (
            <li className="flex items-center gap-2">
              <span className="flex-1 text-ink-muted">AI-draft factor (× {DRAFT_PENALTY})</span>
              <span className="font-mono text-ink tabular">{b.score.toFixed(1)}</span>
            </li>
          ) : null}
        </ul>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-muted">
          100 × (w·sev + w·relevance[{mission}]/3 + w·evidence + w·actionability) / Σw, with 1-5 scales normalised to 0-1.
        </p>
      </PopoverContent>
    </Popover>
  );
}

function InsightCard({ r, selected, mission, label }: { r: RankedFinding; selected: boolean; mission: string; label: string }) {
  const f = r.finding;
  return (
    <article
      id={f.id}
      aria-labelledby={`${f.id}-s`}
      className={cn(
        "relative scroll-mt-28 overflow-hidden rounded-2xl border bg-elev-1 p-5 md:p-6",
        selected ? "border-flame-micro/40" : "border-line",
      )}
    >
      {selected ? <BorderBeam size={110} duration={8} colorFrom="#4CC9F0" colorTo="#7B61FF" /> : null}
      <div className="flex items-start gap-4">
        <div className="w-12 shrink-0 text-center">
          <p className="font-mono text-xs text-ink-muted tabular">#{r.rank}</p>
          <p className="mt-1 font-mono text-2xl text-flame-core tabular">{Math.round(r.score)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={f.category} />
            <StatusBadge status={f.status} reviewer={f.reviewer} />
            <ConfidenceBadge confidence={f.confidence} />
            <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted">{label}</span>
          </div>
          <h3 id={`${f.id}-s`} className="mt-3 text-base leading-relaxed font-medium text-ink">
            {f.statement}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.plainLanguage}</p>
          <p className="mt-3 text-sm leading-relaxed">
            <span className="text-ink-muted">Safety implication: </span>
            <span className="text-ink">{f.safetyImplication}</span>
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {f.evidence.map((ev, i) => (
                <CitationChip key={`${ev.chunkId}-${i}`} sourceId={ev.sourceId} chunkId={ev.chunkId} page={ev.page} excerpt={ev.excerpt} />
              ))}
            </div>
            <BreakdownPopover r={r} mission={mission} />
          </div>
        </div>
      </div>
    </article>
  );
}

export function InsightsView({ findings }: { findings: Finding[] }) {
  const { mission, missionId } = useMission();
  const { experimentById } = useCatalog();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [weights, setWeights] = useState<Weights>(() => parseWeights(params.get("w")) ?? DEFAULT_WEIGHTS);
  const [cats, setCats] = useState<FindingCategory[]>(() => (params.get("cat")?.split(",").filter(Boolean) as FindingCategory[]) ?? []);
  const [conf, setConf] = useState<string[]>(() => params.get("conf")?.split(",").filter(Boolean) ?? []);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const read = () => setHash(window.location.hash.slice(1));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  // Persist weights and filters in the URL (debounced) so a ranking is shareable.
  useEffect(() => {
    const t = setTimeout(() => {
      const q = new URLSearchParams(params.toString());
      const isDefault = PART_ORDER.every((k) => Math.abs(weights[k] - DEFAULT_WEIGHTS[k]) < 1e-6);
      if (isDefault) q.delete("w");
      else q.set("w", PART_ORDER.map((k) => Math.round(weights[k] * 100)).join("-"));
      if (cats.length) q.set("cat", cats.join(","));
      else q.delete("cat");
      if (conf.length) q.set("conf", conf.join(","));
      else q.delete("conf");
      const next = q.toString();
      if (next !== params.toString()) router.replace(`${pathname}?${next}${window.location.hash}`, { scroll: false });
    }, 200);
    return () => clearTimeout(t);
  }, [weights, cats, conf, params, pathname, router]);

  const ranked = useMemo(() => rankFindings(findings, missionId, weights), [findings, missionId, weights]);
  const visible = ranked.filter(
    (r) => (!cats.length || cats.includes(r.finding.category)) && (!conf.length || conf.includes(r.finding.confidence)),
  );
  const sum = PART_ORDER.reduce((a, k) => a + weights[k], 0);
  const label = (id: string) => experimentById.get(id)?.acronym ?? id;
  const categories = Array.from(new Set(findings.map((f) => f.category))) as FindingCategory[];

  const toggle = <T extends string>(list: T[], set: (v: T[]) => void, v: T) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="container-ember grid gap-8 pb-20 lg:grid-cols-[19rem_1fr]">
      <aside aria-label="Ranking controls" className="print:hidden">
        <div className="space-y-6 lg:sticky lg:top-24">
          <section aria-labelledby="w-title" className="rounded-2xl border border-line bg-elev-1 p-5">
            <div className="flex items-center justify-between">
              <h2 id="w-title" className="flex items-center gap-2 text-sm font-medium text-ink">
                <SlidersHorizontal className="size-4 text-ink-muted" strokeWidth={1.5} aria-hidden /> Weights
              </h2>
              <button
                type="button"
                onClick={() => setWeights(DEFAULT_WEIGHTS)}
                className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
              >
                <RotateCcw className="size-3" strokeWidth={1.5} aria-hidden /> Reset
              </button>
            </div>
            <div className="mt-5 space-y-5">
              {PART_ORDER.map((k) => (
                <div key={k}>
                  <div className="flex items-baseline justify-between text-xs">
                    <label id={`w-${k}`} className="flex items-center gap-2 text-ink-muted">
                      <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: PART_COLOR[k] }} />
                      {WEIGHT_LABELS[k]}
                    </label>
                    <span className="font-mono text-ink tabular">
                      {weights[k].toFixed(2)} <span className="text-ink-muted">({sum ? Math.round((weights[k] / sum) * 100) : 0}%)</span>
                    </span>
                  </div>
                  <Slider
                    className="mt-2.5"
                    min={0}
                    max={1}
                    step={0.05}
                    value={[weights[k]]}
                    aria-labelledby={`w-${k}`}
                    onValueChange={(v) => setWeights((w) => ({ ...w, [k]: v[0] }))}
                  />
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-line pt-4 font-mono text-[11px] leading-relaxed text-ink-muted">
              score = 100 × Σ wᵢ·factorᵢ / Σw. Relevance uses the {mission.label} rating (0-3). AI drafts × {DRAFT_PENALTY}.
              All weights at 0 fall back to the defaults.
            </p>
          </section>

          <fieldset className="rounded-2xl border border-line bg-elev-1 p-5">
            <legend className="sr-only">Filter findings</legend>
            <p className="text-xs font-medium text-ink">Category</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={cats.includes(c)}
                  onClick={() => toggle(cats, setCats, c)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    cats.includes(c) ? "border-flame-micro/50 bg-flame-micro/10 text-ink" : "border-line-strong text-ink-muted hover:text-ink",
                  )}
                >
                  {CATEGORY_META[c].label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs font-medium text-ink">Confidence</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["high", "medium", "low"].map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={conf.includes(c)}
                  onClick={() => toggle(conf, setConf, c)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs capitalize transition-colors",
                    conf.includes(c) ? "border-flame-micro/50 bg-flame-micro/10 text-ink" : "border-line-strong text-ink-muted hover:text-ink",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-line-strong text-sm text-ink transition-colors hover:bg-white/[0.05]"
          >
            <FileDown className="size-4" strokeWidth={1.5} aria-hidden /> Export mission brief (PDF)
          </button>
        </div>
      </aside>

      <section aria-label={`Ranked insights for ${mission.label}`} className="min-w-0">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 print:mb-6">
          <p className="text-sm text-ink-muted" aria-live="polite">
            <span className="font-mono text-ink tabular">{visible.length}</span> insights ranked for{" "}
            <span className="text-ink">{mission.label}</span> ({mission.gravityLabel})
          </p>
          <p className="hidden text-xs text-ink-muted print:block">
            EMBER mission brief · research exploration only, not operational guidance
          </p>
        </div>
        {visible.length ? (
          <LayoutGroup>
            <ol className="space-y-3">
              {visible.map((r) => (
                <motion.li
                  key={r.finding.id}
                  layout={reduce ? false : "position"}
                  transition={{ type: "spring", stiffness: 260, damping: 32 }}
                  className="break-inside-avoid"
                >
                  <InsightCard r={r} selected={hash === r.finding.id} mission={mission.short} label={label(r.finding.experimentId)} />
                </motion.li>
              ))}
            </ol>
          </LayoutGroup>
        ) : (
          <EmptyState
            title="No insights match these filters"
            body="Clear the category or confidence filter to see every ranked finding."
            action={{
              label: "Clear filters",
              onClick: () => {
                setCats([]);
                setConf([]);
              },
            }}
          />
        )}
      </section>
    </div>
  );
}
