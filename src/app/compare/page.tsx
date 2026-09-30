import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight, GitCompareArrows } from "lucide-react";
import { ComparePicker } from "@/components/compare/ComparePicker";
import { StatusBadge } from "@/components/ember/badges";
import { CitationChip } from "@/components/ember/CitationChip";
import { EmptyState } from "@/components/ember/states";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  COMPARE_COLORS,
  COMPARE_DIMS,
  COMPARE_LETTERS,
  compareDomains,
  outcomeCounts,
  parseCompareIds,
  position,
} from "@/lib/compare";
import { experiments, findingsFor, getExperiment, measurementsFor, sourcesFor } from "@/lib/data";
import type { Experiment } from "@/lib/schema";
import { formatRange, plural, tidy } from "@/lib/text";

// Per request: the selection lives in ?ids=.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare",
  description:
    "Put two or three NASA microgravity combustion investigations side by side: conditions tested, outcomes and key findings.",
};

const SUGGESTED: { label: string; ids: string[] }[] = [
  { label: "Flame spread at three scales", ids: ["bass-ii", "saffire-ii", "saffire-iv-vi"] },
  { label: "Droplet flames and cool flames", ids: ["flex", "flex-2", "cfi"] },
  { label: "Partial gravity", ids: ["partial-g-centrifuge", "luci"] },
];

function Swatch({ i, size = "size-6" }: { i: number; size?: string }) {
  return (
    <span
      aria-hidden
      className={`flex ${size} text-canvas shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium`}
      style={{ background: COMPARE_COLORS[i] }}
    >
      {COMPARE_LETTERS[i]}
    </span>
  );
}

function years(e: Experiment) {
  return e.years.end && e.years.end !== e.years.start ? `${e.years.start}–${e.years.end}` : `${e.years.start}`;
}

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const { ids: raw } = await searchParams;
  const ids = parseCompareIds(raw, new Set(experiments.map((e) => e.id)));
  const selected = ids.map((id) => getExperiment(id)!).filter(Boolean);
  const domains = compareDomains(experiments);
  const options = [...experiments]
    .sort((a, b) => a.acronym.localeCompare(b.acronym))
    .map((e) => ({ id: e.id, acronym: tidy(e.acronym), fullName: tidy(e.fullName), platform: e.platform }));
  const cols =
    selected.length >= 3
      ? "grid-cols-1 lg:grid-cols-3"
      : selected.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1";

  const rows = selected.map((e) => {
    const fs = findingsFor(e.id);
    const ms = measurementsFor(e.id);
    return {
      e,
      findings: [...fs].sort((a, b) => b.evidenceStrength - a.evidenceStrength || b.severity - a.severity).slice(0, 3),
      findingCount: fs.length,
      outcomes: outcomeCounts(ms),
      sources: sourcesFor(e).length,
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Compare"
        title="Compare experiments"
        description="Put two or three investigations side by side: the conditions each one tested, what happened, and what it found."
      >
        <Suspense fallback={<div className="h-10" />}>
          <ComparePicker options={options} selected={ids} />
        </Suspense>
      </PageHeader>

      <div className="container-ember space-y-14 pb-24">
        {selected.length === 0 ? (
          <div className="grid gap-6 lg:grid-cols-12">
            <EmptyState
              icon={GitCompareArrows}
              className="lg:col-span-5"
              title="Pick up to three experiments"
              body="Use “Add experiment” above, the Compare button on any experiment page, or start from one of these comparisons."
            />
            <ul className="grid gap-3 sm:grid-cols-3 lg:col-span-7 lg:grid-cols-1">
              {SUGGESTED.map((s) => (
                <li key={s.label}>
                  <Link
                    href={`/compare?ids=${s.ids.join(",")}`}
                    // Prefetching a searchParams-driven dynamic page keeps the request open; these are cheap to load on click.
                    prefetch={false}
                    className="group border-line bg-elev-1 flex h-full items-center justify-between gap-4 rounded-2xl border px-5 py-4 transition-colors duration-300 hover:border-white/20"
                  >
                    <span>
                      <span className="text-ink block text-sm">{s.label}</span>
                      <span className="text-ink-muted mt-0.5 block font-mono text-xs">
                        {s.ids.map((id) => tidy(getExperiment(id)?.acronym ?? id)).join(" · ")}
                      </span>
                    </span>
                    <ArrowUpRight
                      className="text-ink-faint group-hover:text-ink size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <section aria-label="Selected experiments" className={`grid gap-4 ${cols}`}>
              {rows.map(({ e }, i) => (
                <article key={e.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-1.5">
                  <div className="border-line bg-elev-1 h-full rounded-[calc(1.5rem-0.375rem)] border p-5">
                    <div className="flex items-center gap-3">
                      <Swatch i={i} size="size-8" />
                      <div className="min-w-0">
                        <h2 className="text-ink text-lg font-medium">
                          <Link href={`/experiments/${e.id}`} className="hover:text-flame-micro">
                            {tidy(e.acronym)}
                          </Link>
                        </h2>
                        <p className="text-ink-muted truncate text-sm">{tidy(e.fullName)}</p>
                      </div>
                    </div>
                    <p className="text-ink-faint mt-3 font-mono text-xs">
                      {e.platform} · {years(e)} · {e.kind === "flight" ? "flight" : "ground"}
                    </p>
                    <p className="text-ink-muted mt-3 line-clamp-4 text-sm leading-relaxed">{e.summaryPlain}</p>
                  </div>
                </article>
              ))}
            </section>
            {selected.length === 1 ? (
              <p className="text-ink-muted -mt-8 text-sm">Add one or two more experiments above to compare them.</p>
            ) : null}

            <section aria-labelledby="coverage">
              <h2 id="coverage" className="eyebrow mb-2">
                Conditions tested
              </h2>
              <p className="text-ink-muted mb-6 max-w-2xl text-sm">
                Each bar is the stated test range; the track spans every investigation in EMBER. Pressure and flow use
                log scales. &ldquo;Not stated&rdquo; means the collected sources give no value, not that the condition
                was absent.
              </p>
              <div className="divide-line border-line bg-elev-1 divide-y rounded-2xl border">
                {COMPARE_DIMS.map((dim) => {
                  const domain = domains[dim.key];
                  return (
                    <div key={dim.key} className="grid gap-3 px-4 py-4 sm:grid-cols-[8rem_1fr] sm:px-5">
                      <div>
                        <p className="text-ink text-sm">{dim.label}</p>
                        <p className="text-ink-faint text-xs">{dim.unit}</p>
                      </div>
                      <div className="space-y-2">
                        {rows.map(({ e }, i) => {
                          const r = e.conditions[dim.key];
                          const a = r && domain ? position(dim, domain, r.min) : 0;
                          const b = r && domain ? position(dim, domain, r.max) : 0;
                          return (
                            <div key={e.id} className="grid grid-cols-[1.5rem_1fr_7.5rem] items-center gap-3">
                              <Swatch i={i} size="size-5" />
                              <div className="relative h-2 rounded-full bg-white/[0.05]">
                                {r && domain ? (
                                  <span
                                    className="absolute top-1/2 h-2 min-w-2 -translate-y-1/2 rounded-full"
                                    style={{
                                      left: `calc(${a * 100}% - ${a === b ? 4 : 0}px)`,
                                      width: a === b ? 8 : `${(b - a) * 100}%`,
                                      background: COMPARE_COLORS[i],
                                    }}
                                    title={`${tidy(e.acronym)}: ${formatRange(r.min, r.max, dim.unit)}`}
                                  />
                                ) : null}
                              </div>
                              <p
                                className={`tabular text-right font-mono text-xs ${r ? "text-ink-muted" : "text-ink-faint italic"}`}
                              >
                                <span className="sr-only">{tidy(e.acronym)}: </span>
                                {r ? formatRange(r.min, r.max, dim.unit === "% O2" ? "%" : dim.unit) : "not stated"}
                              </p>
                            </div>
                          );
                        })}
                        {domain ? (
                          <div className="text-ink-faint grid grid-cols-[1.5rem_1fr_7.5rem] gap-3 text-[10px]">
                            <span />
                            <span className="tabular flex justify-between font-mono">
                              <span>{domain.min}</span>
                              <span>{domain.max}</span>
                            </span>
                            <span />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="glance">
              <h2 id="glance" className="eyebrow mb-4">
                At a glance
              </h2>
              <div
                tabIndex={0}
                role="region"
                aria-labelledby="glance"
                className="border-line focus-visible:outline-flame-micro overflow-x-auto rounded-2xl border focus-visible:outline-2"
              >
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-elev-1">
                    <tr>
                      <th scope="col" className="text-ink-muted w-40 px-4 py-3 text-xs font-medium">
                        <span className="sr-only">Attribute</span>
                      </th>
                      {rows.map(({ e }, i) => (
                        <th key={e.id} scope="col" className="px-4 py-3">
                          <span className="text-ink flex items-center gap-2 font-medium">
                            <Swatch i={i} size="size-5" />
                            {tidy(e.acronym)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-line divide-y align-top">
                    {(
                      [
                        ["Platform", (r) => r.e.platform],
                        ["Facility", (r) => r.e.facility ?? <span className="text-ink-faint">not stated</span>],
                        ["Years", (r) => years(r.e)],
                        ["Fuels", (r) => r.e.fuels.join(", ") || <span className="text-ink-faint">not stated</span>],
                        [
                          "Diluents",
                          (r) =>
                            r.e.conditions.diluent?.join(", ") ?? <span className="text-ink-faint">none stated</span>,
                        ],
                        [
                          "Test points",
                          (r) =>
                            r.outcomes.total ? (
                              <span>
                                <span className="tabular font-mono">{r.outcomes.total}</span>
                                <span className="text-ink-muted block text-xs">
                                  {[
                                    r.outcomes.burned ? `${r.outcomes.burned} burned` : null,
                                    r.outcomes.selfExtinguished
                                      ? `${r.outcomes.selfExtinguished} self-extinguished`
                                      : null,
                                    r.outcomes.noIgnition ? `${r.outcomes.noIgnition} no ignition` : null,
                                    r.outcomes.extinguishedByAgent
                                      ? `${r.outcomes.extinguishedByAgent} extinguished by agent`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </span>
                            ) : (
                              <span className="text-ink-faint">no tabulated test points</span>
                            ),
                        ],
                        ["Findings", (r) => plural(r.findingCount, "finding")],
                        ["Sources", (r) => plural(r.sources, "NASA source")],
                        [
                          "Raw data",
                          (r) =>
                            r.e.psiUrl ? (
                              <a
                                href={r.e.psiUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-flame-micro underline-offset-4 hover:underline"
                              >
                                {r.e.psiAccession ?? "PSI"} {r.e.hasRawData ? "(data files)" : "(record)"}
                              </a>
                            ) : (
                              <span className="text-ink-faint">no PSI record</span>
                            ),
                        ],
                      ] as [string, (r: (typeof rows)[number]) => React.ReactNode][]
                    ).map(([label, cell]) => (
                      <tr key={label}>
                        <th scope="row" className="text-ink-muted px-4 py-3 text-xs font-medium">
                          {label}
                        </th>
                        {rows.map((r) => (
                          <td key={r.e.id} className="text-ink px-4 py-3">
                            {cell(r)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-labelledby="key-findings">
              <h2 id="key-findings" className="eyebrow mb-4">
                Key findings
              </h2>
              <div className={`grid gap-6 ${cols}`}>
                {rows.map(({ e, findings: fs, findingCount }, i) => (
                  <div key={e.id} className="space-y-3">
                    <p className="text-ink flex items-center gap-2 text-sm">
                      <Swatch i={i} size="size-5" />
                      {tidy(e.acronym)}
                      <span className="text-ink-faint">· strongest evidence first</span>
                    </p>
                    {fs.length ? (
                      <ol className="space-y-3">
                        {fs.map((f) => (
                          <li key={f.id} className="border-line bg-elev-1 rounded-xl border p-4">
                            <p className="text-ink text-sm leading-relaxed">{f.plainLanguage}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <StatusBadge status={f.status} reviewer={f.reviewer} />
                              <CitationChip
                                sourceId={f.evidence[0].sourceId}
                                chunkId={f.evidence[0].chunkId}
                                page={f.evidence[0].page}
                                excerpt={f.evidence[0].excerpt}
                              />
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <EmptyState
                        title="No findings extracted yet"
                        body="This investigation is in the archive, but no finding has been drafted from its sources."
                        action={{ href: `/experiments/${e.id}`, label: `Open ${tidy(e.acronym)}` }}
                      />
                    )}
                    {findingCount > fs.length ? (
                      <Link
                        href={`/experiments/${e.id}?tab=findings`}
                        className="text-flame-micro inline-block text-sm underline-offset-4 hover:underline"
                      >
                        All {findingCount} findings
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
