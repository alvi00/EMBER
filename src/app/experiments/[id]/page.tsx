import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, GitCompareArrows, MessageCircleQuestion } from "lucide-react";
import { ExperimentTabs, type ConditionRow, type SourceRow } from "@/components/experiment/ExperimentTabs";
import { FindingCard } from "@/components/experiment/FindingCard";
import { EmptyState, SkeletonLines } from "@/components/ember/states";
import { experiments, findingsFor, getExperiment, measurementsFor, sourcesFor } from "@/lib/data";
import { CATEGORY_LABEL } from "@/lib/explorer";
import { formatRange, plural, tidy } from "@/lib/text";

export function generateStaticParams() {
  return experiments.map((e) => ({ id: e.id }));
}

export async function generateMetadata(props: PageProps<"/experiments/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const e = getExperiment(id);
  if (!e) return { title: "Experiment not found" };
  return { title: `${tidy(e.acronym)}`, description: e.summaryPlain };
}

const TYPE_LABEL: Record<string, string> = {
  "psi-dataset": "NASA PSI",
  "ntrs-report": "NTRS report",
  presentation: "Presentation",
  journal: "Journal article",
  "nasa-web": "NASA web page",
};

export default async function ExperimentPage(props: PageProps<"/experiments/[id]">) {
  const { id } = await props.params;
  const e = getExperiment(id);
  if (!e) notFound();

  const fs = findingsFor(e.id);
  const ms = measurementsFor(e.id);
  const srcs = sourcesFor(e);
  const acronym = tidy(e.acronym);
  const c = e.conditions;

  const conditions: ConditionRow[] = [
    c.o2Percent && { label: "Oxygen", value: formatRange(c.o2Percent.min, c.o2Percent.max, "% O2"), note: c.o2Percent.note },
    c.pressureKpa && { label: "Pressure", value: formatRange(c.pressureKpa.min, c.pressureKpa.max, "kPa"), note: c.pressureKpa.note },
    c.flowCmS && { label: "Flow speed", value: formatRange(c.flowCmS.min, c.flowCmS.max, "cm/s"), note: c.flowCmS.note },
    c.gravityG && { label: "Gravity", value: formatRange(c.gravityG.min, c.gravityG.max, "g", 3), note: c.gravityG.note },
    c.diluent?.length && { label: "Diluents", value: c.diluent.join(", ") },
  ].filter(Boolean) as ConditionRow[];

  const sources: SourceRow[] = srcs.map((s) => ({
    id: s.id,
    title: tidy(s.title),
    kind: TYPE_LABEL[s.type] ?? s.type,
    year: s.year,
    authors: s.authors?.slice(0, 3).join(", "),
    url: s.url,
    local: Boolean(s.localPath),
  }));

  const years = `${e.years.start}${e.years.end && e.years.end !== e.years.start ? `-${e.years.end}` : ""}`;
  const askQ = `What did ${acronym} find that matters for fire safety?`;

  const summary = (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="max-w-[68ch] space-y-8">
        <section aria-labelledby="s-what">
          <h2 id="s-what" className="text-lg font-medium text-ink">
            In plain language
          </h2>
          <p className="mt-2 text-base leading-relaxed text-ink-muted">{e.summaryPlain}</p>
        </section>
        <section aria-labelledby="s-why">
          <h2 id="s-why" className="text-lg font-medium text-ink">
            Why it matters for the Moon and Mars
          </h2>
          <p className="mt-2 text-base leading-relaxed text-ink-muted">{e.whyItMatters}</p>
        </section>
        <section aria-labelledby="s-obj">
          <h2 id="s-obj" className="text-lg font-medium text-ink">
            Objectives (as stated by NASA)
          </h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-muted">{e.objectives}</p>
        </section>
      </div>
      <aside className="h-max rounded-2xl border border-line bg-elev-1 p-5 text-sm">
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-ink-muted">Categories</dt>
            <dd className="mt-1 text-ink">{e.category.map((x) => CATEGORY_LABEL[x]).join(", ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Fuels and materials</dt>
            <dd className="mt-1 text-ink">{e.fuels.join("; ")}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Agencies</dt>
            <dd className="mt-1 text-ink">{e.agencies.join(", ")}</dd>
          </div>
          {e.yearsNote ? (
            <div>
              <dt className="text-xs text-ink-muted">About the dates</dt>
              <dd className="mt-1 text-xs leading-relaxed text-ink-muted">{e.yearsNote}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-ink-muted">Evidence in EMBER</dt>
            <dd className="mt-1 font-mono text-xs text-ink tabular">
              {plural(fs.length, "finding")} · {plural(ms.length, "test point")} · {plural(srcs.length, "source")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">Record status</dt>
            <dd className="mt-1 text-xs text-ink-muted">
              {e.verified ? "Verified by a reviewer" : "Metadata compiled from NASA records; not yet human-verified"}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );

  const findingsNode = fs.length ? (
    <div className="grid gap-4 xl:grid-cols-2">
      {fs.map((f) => (
        <FindingCard key={f.id} finding={f} />
      ))}
    </div>
  ) : (
    <EmptyState
      title={`No findings extracted for ${acronym} yet`}
      body="Its sources are still searchable: ask a question and the copilot will cite the passages directly."
      action={{ href: `/ask?q=${encodeURIComponent(askQ)}`, label: `Ask about ${acronym}` }}
    />
  );

  return (
    <div className="pb-20">
      <header className="container-ember pt-10 pb-8 md:pt-14">
        <Link href="/experiments" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden /> All experiments
        </Link>
        <p className="mt-6 font-mono text-xs text-ink-muted tabular">
          {e.platform}
          {e.facility ? ` · ${e.facility}` : ""} · {years}
        </p>
        <h1 className="mt-3 font-display text-5xl leading-[1.02] text-ink md:text-7xl">{acronym}</h1>
        <p className="mt-3 max-w-3xl text-lg text-ink-muted">{tidy(e.fullName)}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link
            href={`/ask?q=${encodeURIComponent(askQ)}`}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-canvas transition-colors hover:bg-white"
          >
            <MessageCircleQuestion className="size-4" strokeWidth={1.5} aria-hidden /> Ask about this experiment
          </Link>
          <Link
            href={`/compare?ids=${e.id}`}
            prefetch={false}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm text-ink transition-colors hover:bg-white/[0.05]"
          >
            <GitCompareArrows className="size-4" strokeWidth={1.5} aria-hidden /> Compare with…
          </Link>
          {e.psiUrl ? (
            <a
              href={e.psiUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-flame-micro hover:underline"
            >
              NASA PSI {e.psiAccession} <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden />
              <span className="sr-only">(opens NASA site)</span>
            </a>
          ) : null}
          {e.doi ? <span className="font-mono text-xs text-ink-muted">DOI {e.doi}</span> : null}
        </div>
      </header>
      <div className="container-ember">
        <Suspense fallback={<SkeletonLines lines={6} />}>
          <ExperimentTabs
            experimentId={e.id}
            acronym={acronym}
            summary={summary}
            findings={findingsNode}
            conditions={conditions}
            conditionSources={e.conditionsSourceIds}
            measurements={ms}
            sources={sources}
            psiUrl={e.psiUrl}
          />
        </Suspense>
      </div>
    </div>
  );
}
