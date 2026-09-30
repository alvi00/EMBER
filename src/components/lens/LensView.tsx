"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CircleCheck, CircleDot, Compass, FlaskConical, Info, ShieldAlert } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { CoverageHeatmap } from "@/components/charts/CoverageHeatmap";
import { AXES, OutcomeScatter } from "@/components/charts/OutcomeScatter";
import { OutcomeBadge, StatusBadge } from "@/components/ember/badges";
import { CitationChip } from "@/components/ember/CitationChip";
import { EmptyState } from "@/components/ember/states";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useMission } from "@/hooks/use-mission";
import { buildCoverageGrid, gravityRowFor, o2BinFor, O2_BINS } from "@/lib/coverage-grid";
import { assessCoverage, buildNormaliser, dimLabel, VERDICT_LABEL, type Query, type Verdict } from "@/lib/coverage";
import type { Finding, Measurement } from "@/lib/schema";
import { rankFindings } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const GRAVITY_PRESETS = [
  { label: "Space", g: 0 },
  { label: "Moon", g: 0.166 },
  { label: "Mars", g: 0.38 },
  { label: "Earth", g: 1 },
];
const ANY = "any";

type LensState = { g: number; o2: number; p: number; flow: number; fuel: string; geom: string };

const VERDICT_STYLE: Record<Verdict, { icon: typeof CircleCheck; cls: string; blurb: string }> = {
  direct: {
    icon: CircleCheck,
    cls: "border-ok/40 bg-ok/[0.07] text-ok",
    blurb: "A test point sits on your conditions. The outcome of that test is direct evidence for this material family.",
  },
  near: {
    icon: CircleDot,
    cls: "border-flame-core/40 bg-flame-core/[0.07] text-flame-core",
    blurb: "Tests exist close to your conditions but not on them. Treat trends as indicative, not confirmed.",
  },
  extrapolation: {
    icon: AlertTriangle,
    cls: "border-flame-earth/45 bg-flame-earth/[0.08] text-flame-earth",
    blurb: "No test in the dataset is close to these conditions. Any statement here would be an extrapolation.",
  },
};

function num(v: string | null, fallback: number): number {
  const n = v === null ? Number.NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function LensView({ measurements, findings }: { measurements: Measurement[]; findings: Finding[] }) {
  const { mission, missionId } = useMission();
  const { experimentById } = useCatalog();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const families = useMemo(() => Array.from(new Set(measurements.map((m) => m.fuelFamily))).sort(), [measurements]);
  const defaults: LensState = {
    g: mission.gravityG,
    o2: mission.cabin.o2Percent,
    p: mission.cabin.pressureKpa,
    flow: mission.cabin.flowCmS,
    fuel: families.includes("Thin fabric (cotton/fiberglass)") ? "Thin fabric (cotton/fiberglass)" : ANY,
    geom: ANY,
  };
  const fromUrl: LensState = {
    g: num(params.get("g"), defaults.g),
    o2: num(params.get("o2"), defaults.o2),
    p: num(params.get("p"), defaults.p),
    flow: num(params.get("flow"), defaults.flow),
    fuel: params.get("fuel") ?? defaults.fuel,
    geom: params.get("geom") ?? defaults.geom,
  };
  const [s, setS] = useState<LensState>(fromUrl);
  const urlKey = params.toString();
  // Re-sync when the URL or the mission changes (e.g. switching mission resets the cabin to that mission's defaults).
  useEffect(() => setS(fromUrl), [urlKey, missionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => {
      const q = new URLSearchParams(params.toString());
      const set = (k: string, v: number | string, d: number | string) => (v === d ? q.delete(k) : q.set(k, String(v)));
      set("g", s.g, defaults.g);
      set("o2", s.o2, defaults.o2);
      set("p", s.p, defaults.p);
      set("flow", s.flow, defaults.flow);
      set("fuel", s.fuel, defaults.fuel);
      set("geom", s.geom, defaults.geom);
      if (q.toString() !== params.toString()) router.replace(`${pathname}?${q}`, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [s]); // eslint-disable-line react-hooks/exhaustive-deps

  const scope = useMemo(
    () => measurements.filter((m) => (s.fuel === ANY || m.fuelFamily === s.fuel) && (s.geom === ANY || m.geometry === s.geom)),
    [measurements, s.fuel, s.geom],
  );
  const normaliser = useMemo(() => buildNormaliser(measurements), [measurements]);
  const query: Query = { gravityG: s.g, o2Percent: s.o2, pressureKpa: s.p, flowCmS: s.flow };
  const result = useMemo(() => assessCoverage(query, scope, { normaliser }), [scope, normaliser, s.g, s.o2, s.p, s.flow]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = VERDICT_STYLE[result.verdict];
  const VerdictIcon = style.icon;

  const hasFlow = scope.filter((m) => m.flowCmS !== undefined && m.o2Percent !== undefined).length >= 3;
  const yAxis = hasFlow ? { ...AXES.flowCmS, log: true } : { ...AXES.pressureKpa, log: true };
  const crossY = hasFlow ? s.flow : s.p;

  const grid = useMemo(() => buildCoverageGrid(scope), [scope]);
  const cabinRow = gravityRowFor(s.g);
  const cabinCell = { row: cabinRow.id, col: o2BinFor(s.o2).id };

  const gaps = useMemo(() => {
    const out: string[] = [];
    const sameG = scope.filter((m) => Math.abs(m.gravityG - s.g) <= 0.02);
    const fam = s.fuel === ANY ? "any material" : s.fuel;
    if (!sameG.length) out.push(`No ${fam} tests at ${s.g.toFixed(2)} g. Partial-gravity flammability limits for this family are untested in the dataset.`);
    const o2s = sameG.map((m) => m.o2Percent).filter((v): v is number => v !== undefined);
    if (sameG.length && o2s.length && s.o2 > Math.max(...o2s)) out.push(`At ${cabinRow.label}, tests stop at ${Math.max(...o2s)}% O2; your cabin is at ${s.o2}%.`);
    const ps = scope.map((m) => m.pressureKpa).filter((v): v is number => v !== undefined);
    if (ps.length && (s.p < Math.min(...ps) - 1 || s.p > Math.max(...ps) + 1))
      out.push(`${fam} tests span ${Math.min(...ps)}-${Math.max(...ps)} kPa; ${s.p} kPa is outside that range.`);
    if (!ps.length) out.push(`No ${fam} test records a cabin pressure.`);
    const emptyBins = O2_BINS.filter((b) => !grid.some((c) => c.row === cabinRow.id && c.col === b.id && c.count > 0)).map((b) => b.label);
    if (emptyBins.length) out.push(`At ${cabinRow.label}, no ${fam} test points in O2 bands ${emptyBins.join(", ")}.`);
    for (const d of result.unmatchedDims) out.push(`No ${fam} test states ${dimLabel(d)}.`);
    return out;
  }, [scope, s.g, s.o2, s.p, s.fuel, grid, cabinRow, result.unmatchedDims]);

  const insights = useMemo(
    () => rankFindings(findings, missionId).filter((r) => r.finding.missionRelevance[missionId] >= 2).slice(0, 4),
    [findings, missionId],
  );
  const label = (id: string) => experimentById.get(id)?.acronym ?? id;

  const field = "w-full rounded-xl border border-line-strong bg-elev-2 px-3 py-2 text-sm text-ink focus-visible:border-flame-micro/60 focus-visible:outline-none";

  return (
    <div className="container-ember pb-20">
      <div role="note" className="mb-6 flex items-start gap-3 rounded-2xl border border-flame-earth/30 bg-flame-earth/[0.06] p-4 text-sm">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-flame-earth" strokeWidth={1.5} aria-hidden />
        <p className="text-ink">
          <strong className="font-medium">Research exploration tool. Not for operational safety decisions.</strong>{" "}
          <span className="text-ink-muted">
            The Lens shows how close your conditions are to conditions NASA tested. It does not predict whether a fire will
            start or spread.
          </span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <section aria-labelledby="lens-inputs" className="h-max rounded-2xl border border-line bg-elev-1 p-5 lg:sticky lg:top-24">
          <h2 id="lens-inputs" className="flex items-center gap-2 text-sm font-medium text-ink">
            <Compass className="size-4 text-ink-muted" strokeWidth={1.5} aria-hidden /> Your cabin
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Defaults from {mission.label} ({mission.cabin.sourced ? "NASA source" : "assumed"}). Edit any value.
          </p>

          <fieldset className="mt-5">
            <legend className="text-xs text-ink-muted">Gravity</legend>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {GRAVITY_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={Math.abs(s.g - p.g) < 0.005}
                  onClick={() => setS({ ...s, g: p.g })}
                  className={cn(
                    "rounded-lg border px-1 py-2 text-xs transition-colors",
                    Math.abs(s.g - p.g) < 0.005 ? "border-flame-micro/50 bg-flame-micro/10 text-ink" : "border-line-strong text-ink-muted hover:text-ink",
                  )}
                >
                  {p.label}
                  <span className="block font-mono text-[10px] text-ink-faint">{p.g} g</span>
                </button>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
              Custom
              <input
                type="number"
                min={0}
                max={1.5}
                step={0.01}
                value={s.g}
                onChange={(e) => setS({ ...s, g: Math.min(1.5, Math.max(0, Number(e.target.value) || 0)) })}
                className={cn(field, "w-24 py-1.5 font-mono tabular")}
              />
              g
            </label>
          </fieldset>

          {(
            [
              { k: "o2", label: "Cabin O2", unit: "%", min: 10, max: 40, step: 0.5 },
              { k: "p", label: "Pressure", unit: "kPa", min: 30, max: 320, step: 0.5 },
              { k: "flow", label: "Ventilation flow", unit: "cm/s", min: 0, max: 60, step: 0.5 },
            ] as const
          ).map((f) => (
            <div key={f.k} className="mt-5">
              <div className="flex items-baseline justify-between text-xs">
                <label id={`lens-${f.k}`} className="text-ink-muted">
                  {f.label}
                </label>
                <span className="font-mono text-ink tabular">
                  {s[f.k]} {f.unit}
                </span>
              </div>
              <Slider
                className="mt-2.5"
                min={f.min}
                max={f.max}
                step={f.step}
                value={[s[f.k]]}
                aria-labelledby={`lens-${f.k}`}
                onValueChange={(v) => setS({ ...s, [f.k]: v[0] })}
              />
            </div>
          ))}

          <div className="mt-5 grid gap-3">
            <label className="text-xs text-ink-muted">
              Material family
              <select value={s.fuel} onChange={(e) => setS({ ...s, fuel: e.target.value })} className={cn(field, "mt-1.5")}>
                <option value={ANY}>Any tested material</option>
                {families.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-muted">
              Geometry
              <select value={s.geom} onChange={(e) => setS({ ...s, geom: e.target.value })} className={cn(field, "mt-1.5")}>
                <option value={ANY}>Any geometry</option>
                {["thin-sheet", "thick", "droplet", "gas-jet"].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => router.replace(`${pathname}?mission=${missionId}`, { scroll: false })}
            className="mt-4 text-xs text-flame-micro hover:underline"
          >
            Reset to {mission.label} defaults
          </button>
        </section>

        <div className="min-w-0 space-y-6">
          <section aria-labelledby="verdict" aria-live="polite" className={cn("rounded-2xl border p-5 md:p-6", style.cls)}>
            <p className="font-mono text-xs opacity-80">Coverage verdict · {result.pointsInScope} test points in scope</p>
            <h2 id="verdict" className="mt-2 flex items-center gap-2.5 text-2xl font-medium">
              <VerdictIcon className="size-6 shrink-0" strokeWidth={1.5} aria-hidden />
              {VERDICT_LABEL[result.verdict]}
            </h2>
            <p className="mt-2 max-w-[62ch] text-sm text-ink">{style.blurb}</p>
            {result.best ? (
              <p className="mt-2 font-mono text-xs text-ink-muted tabular">
                Closest test {result.best.point.testId} ({label(result.best.point.experimentId)}), normalised distance{" "}
                {result.best.distance.toFixed(3)} (direct &lt; 0.05, near &lt; 0.15)
              </p>
            ) : null}
            {result.warnings.length ? (
              <ul className="mt-3 space-y-1.5 text-sm text-ink">
                {result.warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <Info className="mt-0.5 size-4 shrink-0 text-flame-core" strokeWidth={1.5} aria-hidden />
                    {w}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <section aria-labelledby="map" className="rounded-2xl border border-line bg-elev-1 p-5">
              <h2 id="map" className="text-sm font-medium text-ink">
                Flammability map
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                {s.fuel === ANY ? "All tested materials" : s.fuel}: oxygen against {hasFlow ? "flow speed" : "pressure"}, every
                gravity level. The crosshair is your cabin.
              </p>
              {scope.length ? (
                <OutcomeScatter
                  points={scope}
                  x={AXES.o2Percent}
                  y={yAxis}
                  height={300}
                  crosshair={{ x: s.o2, y: Math.max(crossY, hasFlow ? 0.1 : 1), label: "Your cabin" }}
                  caption={`${scope.length} test points for ${s.fuel === ANY ? "all materials" : s.fuel}.`}
                  sourceLabel={(m) => label(m.experimentId)}
                />
              ) : (
                <EmptyState title="No test points for this material and geometry" body="Pick “Any tested material” to see all data." />
              )}
            </section>

            <section aria-labelledby="nearest" className="rounded-2xl border border-line bg-elev-1 p-5">
              <h2 id="nearest" className="text-sm font-medium text-ink">
                Nearest tested points
              </h2>
              {result.nearest.length ? (
                <ol className="mt-3 divide-y divide-line">
                  {result.nearest.map((n) => (
                    <li key={n.point.id} className="py-3 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-ink">
                            {n.point.testId} <span className="text-ink-muted">· {label(n.point.experimentId)}</span>
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-ink-muted tabular">
                            {n.point.gravityG} g
                            {n.point.o2Percent !== undefined ? ` · ${n.point.o2Percent}% O2` : ""}
                            {n.point.pressureKpa !== undefined ? ` · ${n.point.pressureKpa} kPa` : ""}
                            {n.point.flowCmS !== undefined ? ` · ${n.point.flowCmS} cm/s` : ""}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-muted">{n.point.fuel}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-sm text-ink tabular">d = {n.distance.toFixed(3)}</p>
                          {n.gravityMismatch ? <p className="text-[11px] text-flame-core">other gravity</p> : null}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <OutcomeBadge outcome={n.point.outcome} />
                        <CitationChip sourceId={n.point.sourceId} page={n.point.page} />
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title="No comparable test points" body="Try another material family or widen the conditions." />
              )}
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section aria-labelledby="gaps" className="rounded-2xl border border-line bg-elev-1 p-5">
              <h2 id="gaps" className="flex items-center gap-2 text-sm font-medium text-ink">
                <FlaskConical className="size-4 text-ink-muted" strokeWidth={1.5} aria-hidden /> Evidence gaps
              </h2>
              <p className="mt-1 text-xs text-ink-muted">Where future experiments are needed for this cabin.</p>
              {gaps.length ? (
                <ul className="mt-3 space-y-2 text-sm text-ink">
                  {gaps.map((g) => (
                    <li key={g} className="flex gap-2">
                      <span aria-hidden className="hatch mt-1 inline-block size-3 shrink-0 rounded-[3px] bg-elev-2" />
                      {g}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">No obvious gaps around these conditions in the collected data.</p>
              )}
              <div className="mt-5">
                <CoverageHeatmap cells={grid} missionCell={cabinCell} experimentLabel={label} compact />
              </div>
            </section>

            <section aria-labelledby="rel" className="rounded-2xl border border-line bg-elev-1 p-5">
              <h2 id="rel" className="text-sm font-medium text-ink">
                Relevant insights for {mission.label}
              </h2>
              <ul className="mt-3 space-y-4">
                {insights.map((r) => (
                  <li key={r.finding.id}>
                    <Link href={`/insights?mission=${missionId}#${r.finding.id}`} className="text-sm leading-relaxed text-ink hover:underline">
                      {r.finding.plainLanguage}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={r.finding.status} />
                      <CitationChip
                        sourceId={r.finding.evidence[0].sourceId}
                        chunkId={r.finding.evidence[0].chunkId}
                        page={r.finding.evidence[0].page}
                        excerpt={r.finding.evidence[0].excerpt}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
