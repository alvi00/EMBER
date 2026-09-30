"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ember/states";
import { OutcomeBadge } from "@/components/ember/badges";
import { CitationChip } from "@/components/ember/CitationChip";
import { AXES, OutcomeScatter, type ScatterAxis } from "@/components/charts/OutcomeScatter";
import type { Measurement } from "@/lib/schema";

export const TABS = ["summary", "findings", "conditions", "data", "sources"] as const;
export type TabId = (typeof TABS)[number];

export type ConditionRow = { label: string; value: string; note?: string };
export type SourceRow = { id: string; title: string; kind: string; year?: number; authors?: string; url: string; local: boolean };

function chooseAxes(ms: Measurement[]): [ScatterAxis, ScatterAxis] | null {
  const keys: ScatterAxis["key"][] = ["o2Percent", "pressureKpa", "flowCmS", "gravityG"];
  const variety = (k: ScatterAxis["key"]) => new Set(ms.map((m) => m[k]).filter((v) => v !== undefined)).size;
  const usable = keys.filter((k) => variety(k) >= 2).sort((a, b) => variety(b) - variety(a));
  if (usable.length < 2) {
    if (usable.length === 1 && usable[0] !== "o2Percent" && variety("o2Percent") >= 1) return [AXES.o2Percent, AXES[usable[0]]];
    return null;
  }
  const xKey = usable.includes("o2Percent") ? "o2Percent" : usable[0];
  const yKey = usable.find((k) => k !== xKey)!;
  const y = { ...AXES[yKey], log: yKey === "flowCmS" || yKey === "pressureKpa" };
  return [AXES[xKey], y];
}

function toCsv(rows: Measurement[]): string {
  const cols: (keyof Measurement)[] = [
    "id",
    "experimentId",
    "testId",
    "fuel",
    "fuelFamily",
    "geometry",
    "thicknessMm",
    "o2Percent",
    "pressureKpa",
    "flowCmS",
    "gravityG",
    "diluent",
    "outcome",
    "rawOutcome",
    "spreadRateMmS",
    "burnDurationS",
    "sourceId",
    "page",
    "notes",
  ];
  const esc = (v: unknown) => {
    if (v === undefined || v === null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function ExperimentTabs({
  experimentId,
  acronym,
  summary,
  findings,
  conditions,
  conditionSources,
  measurements,
  sources,
  psiUrl,
}: {
  experimentId: string;
  acronym: string;
  summary: React.ReactNode;
  findings: React.ReactNode;
  conditions: ConditionRow[];
  conditionSources: string[];
  measurements: Measurement[];
  sources: SourceRow[];
  psiUrl?: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab = (TABS as readonly string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as TabId) : "summary";
  const axes = chooseAxes(measurements);

  const setTab = (t: string) => {
    const q = new URLSearchParams(params.toString());
    if (t === "summary") q.delete("tab");
    else q.set("tab", t);
    router.replace(q.toString() ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const download = () => {
    const blob = new Blob([toCsv(measurements)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ember-${experimentId}-measurements.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <div className="no-scrollbar -mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)]">
        <TabsList className="h-auto gap-1 rounded-xl border border-line bg-elev-1 p-1">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-lg px-4 py-2 text-sm capitalize data-[state=active]:bg-white/[0.08]">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="summary" className="mt-8">
        {summary}
      </TabsContent>

      <TabsContent value="findings" className="mt-8">
        {findings}
      </TabsContent>

      <TabsContent value="conditions" className="mt-8 space-y-8">
        {conditions.length ? (
          <div className="overflow-hidden rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Test condition ranges for {acronym}</caption>
              <thead className="bg-elev-2 text-xs text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Condition</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Range</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {conditions.map((c) => (
                  <tr key={c.label} className="border-t border-line">
                    <th scope="row" className="px-4 py-3 font-normal text-ink-muted">{c.label}</th>
                    <td className="px-4 py-3 font-mono text-ink tabular">{c.value}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted">{c.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No condition ranges stated" body="The collected sources do not state numeric test conditions for this investigation." />
        )}
        {conditionSources.length ? (
          <p className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            Ranges from: {conditionSources.map((s) => <CitationChip key={s} sourceId={s} />)}
          </p>
        ) : null}
        {measurements.length && axes ? (
          <div className="rounded-2xl border border-line bg-elev-1 p-5">
            <h3 className="text-sm font-medium text-ink">Test matrix</h3>
            <OutcomeScatter
              points={measurements}
              x={axes[0]}
              y={axes[1]}
              caption={`${measurements.length} normalised test points for ${acronym}, coloured and shaped by outcome.`}
            />
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="data" className="mt-8">
        {measurements.length ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-muted">
                {measurements.length} normalised test points. Units: % O2, kPa, cm/s, g. Every row keeps its source.
              </p>
              <button
                type="button"
                onClick={download}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm text-ink transition-colors hover:bg-white/[0.05]"
              >
                <Download className="size-4" strokeWidth={1.5} aria-hidden /> Download CSV
              </button>
            </div>
            <div className="max-h-[60dvh] overflow-auto rounded-2xl border border-line">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">Measurements for {acronym}</caption>
                <thead className="text-xs text-ink-muted">
                  <tr>
                    {["Test", "Fuel", "O2 %", "kPa", "cm/s", "g", "Outcome", "Source"].map((h) => (
                      <th key={h} scope="col" className="sticky top-0 bg-elev-2 px-3 py-2.5 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {measurements.map((m) => (
                    <tr key={m.id} className="border-t border-line/60">
                      <td className="px-3 py-2 font-mono text-xs text-ink">{m.testId}</td>
                      <td className="px-3 py-2 text-xs text-ink-muted">{m.fuel}</td>
                      <td className="px-3 py-2 font-mono text-xs tabular">{m.o2Percent ?? "·"}</td>
                      <td className="px-3 py-2 font-mono text-xs tabular">{m.pressureKpa ?? "·"}</td>
                      <td className="px-3 py-2 font-mono text-xs tabular">{m.flowCmS ?? "·"}</td>
                      <td className="px-3 py-2 font-mono text-xs tabular">{m.gravityG}</td>
                      <td className="px-3 py-2">
                        <OutcomeBadge outcome={m.outcome} />
                      </td>
                      <td className="px-3 py-2">
                        <CitationChip sourceId={m.sourceId} page={m.page} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-ink-muted">“·” = not stated in the source (never filled in).</p>
          </div>
        ) : (
          <EmptyState
            title="No normalised test data for this investigation yet"
            body="Raw and processed files may still be available in NASA PSI."
            action={psiUrl ? { href: psiUrl, label: "Open the PSI record" } : { href: "/methods", label: "How test data is normalised" }}
          />
        )}
      </TabsContent>

      <TabsContent value="sources" className="mt-8">
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-ink">{s.title}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {[s.kind, s.year, s.authors].filter(Boolean).join(" · ")}
                  {s.local ? " · text indexed for search" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CitationChip sourceId={s.id} />
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-flame-micro hover:underline"
                >
                  Original <ExternalLink className="size-3" strokeWidth={1.5} aria-hidden />
                  <span className="sr-only">(opens NASA site)</span>
                </a>
              </div>
            </li>
          ))}
        </ul>
      </TabsContent>
    </Tabs>
  );
}
