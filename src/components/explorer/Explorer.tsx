"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MiniSearch from "minisearch";
import { ArrowDown, ArrowUp, LayoutGrid, Rows3, Search, SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ember/states";
import { Highlight } from "@/components/ember/Highlight";
import { FilterRail, type Bounds } from "@/components/explorer/FilterRail";
import {
  CATEGORY_LABEL,
  activeFilterCount,
  filterRows,
  parseExplorerState,
  serializeExplorerState,
  type ExplorerRow,
  type ExplorerState,
} from "@/lib/explorer";
import { plural } from "@/lib/text";
import { cn } from "@/lib/utils";

type SemanticResult = { experimentId: string; score: number; snippet: string };

const SORTS: { id: string; label: string; get: (r: ExplorerRow) => string | number }[] = [
  { id: "acronym", label: "Acronym", get: (r) => r.acronym.toLowerCase() },
  { id: "platform", label: "Platform", get: (r) => r.platform },
  { id: "start", label: "Years", get: (r) => r.start },
  { id: "findings", label: "Findings", get: (r) => r.findings },
  { id: "testPoints", label: "Test points", get: (r) => r.testPoints },
  { id: "sources", label: "Sources", get: (r) => r.sources },
];

export function Explorer({ rows, bounds }: { rows: ExplorerRow[]; bounds: Bounds }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlState = useMemo(() => parseExplorerState(new URLSearchParams(params.toString())), [params]);
  // Optimistic copy: controls respond instantly while the URL (the source of truth for sharing) catches up.
  const [state, setState] = useState<ExplorerState>(urlState);
  // When the URL changes (back/forward, shared link), adopt it. Adjusting state during render avoids an extra effect pass.
  const [syncedUrl, setSyncedUrl] = useState(urlState);
  if (syncedUrl !== urlState) {
    setSyncedUrl(urlState);
    setState(urlState);
  }
  const [query, setQuery] = useState(state.q);
  const [syncedQ, setSyncedQ] = useState(state.q);
  if (syncedQ !== state.q) {
    setSyncedQ(state.q);
    setQuery(state.q);
  }
  const [semantic, setSemantic] = useState<{ q: string; results: SemanticResult[]; mode: string } | null>(null);

  const update = useCallback(
    (patch: Partial<ExplorerState>) => {
      const next = { ...state, ...patch };
      setState(next);
      const qs = serializeExplorerState(next, new URLSearchParams(params.toString()));
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router, state],
  );

  // Debounce typing into the URL.
  useEffect(() => {
    if (query === state.q) return;
    const t = setTimeout(() => update({ q: query }), 250);
    return () => clearTimeout(t);
  }, [query, state.q, update]);

  // Semantic half of the hybrid search (server: BM25 + embeddings over source passages).
  useEffect(() => {
    const q = state.q.trim();
    // Short queries are keyword-only; results are always matched to their query (semantic.q), so no reset is needed.
    if (q.length < 3) return;
    const ctrl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => json && setSemantic({ q, results: json.results ?? [], mode: json.mode }))
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [state.q]);

  const lexicalIndex = useMemo(() => {
    const ms = new MiniSearch<ExplorerRow>({
      fields: ["acronym", "fullName", "summary", "objectives", "fuelsText", "categoryText"],
      storeFields: ["id"],
      extractField: (doc, field) => {
        if (field === "fuelsText") return doc.fuels.join(" ");
        if (field === "categoryText") return doc.category.map((c) => CATEGORY_LABEL[c]).join(" ");
        return (doc as unknown as Record<string, string>)[field];
      },
      searchOptions: { boost: { acronym: 4, fullName: 2 }, prefix: true, fuzzy: 0.2 },
    });
    ms.addAll(rows);
    return ms;
  }, [rows]);

  const { rows: filtered, missingDims } = useMemo(() => filterRows(rows, state), [rows, state]);

  const { ordered, snippets } = useMemo(() => {
    const q = state.q.trim();
    const snippetMap = new Map<string, string>();
    if (!q) {
      const s = SORTS.find((x) => x.id === state.sort) ?? SORTS[2];
      const dir = state.dir === "asc" ? 1 : -1;
      const sorted = [...filtered].sort((a, b) => {
        const va = s.get(a);
        const vb = s.get(b);
        return (va < vb ? -1 : va > vb ? 1 : 0) * dir || a.acronym.localeCompare(b.acronym);
      });
      return { ordered: sorted, snippets: snippetMap };
    }
    // Reciprocal-rank fusion of lexical (experiment fields) and semantic (source passages) rankings.
    const lex = lexicalIndex.search(q).map((r) => String(r.id));
    // Only the strongest semantic matches join the ranking, so passage-level recall does not swamp precision.
    const sem = semantic?.q === q ? semantic.results.slice(0, 8) : [];
    sem.forEach((r) => snippetMap.set(r.experimentId, r.snippet));
    const score = new Map<string, number>();
    lex.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (60 + i + 1)));
    sem.forEach((r, i) => score.set(r.experimentId, (score.get(r.experimentId) ?? 0) + 1 / (60 + i + 1)));
    const matched = filtered.filter((r) => score.has(r.id)).sort((a, b) => score.get(b.id)! - score.get(a.id)!);
    return { ordered: matched, snippets: snippetMap };
  }, [filtered, lexicalIndex, semantic, state.q, state.sort, state.dir]);

  const active = activeFilterCount(state);
  const terms = state.q.trim().split(/\s+/).filter((t) => t.length > 2);
  const searching = state.q.trim().length >= 3 && semantic?.q !== state.q.trim();

  const rail = <FilterRail state={state} bounds={bounds} rows={rows} onChange={update} />;

  return (
    <div className="container-ember grid gap-8 pb-20 lg:grid-cols-[17rem_1fr]">
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2">{rail}</div>
      </aside>

      <section aria-label="Experiments" className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 basis-72">
            <span className="sr-only">Search experiments and their sources</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.5} aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search experiments, fuels, results… e.g. “cool flames” or “smoke detector”"
              className="h-11 w-full rounded-xl border border-line-strong bg-elev-1 pr-10 pl-10 [&::-webkit-search-cancel-button]:appearance-none text-sm text-ink placeholder:text-ink-faint focus-visible:border-flame-micro/60 focus-visible:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  update({ q: "" });
                }}
                className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:text-ink"
                aria-label="Clear search"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
            ) : null}
          </label>

          <Sheet>
            <SheetTrigger className="inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong px-4 text-sm text-ink lg:hidden">
              <SlidersHorizontal className="size-4" strokeWidth={1.5} aria-hidden />
              Filters{active ? ` (${active})` : ""}
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto border-line bg-elev-2 p-6">
              <SheetTitle className="text-lg font-medium">Filters</SheetTitle>
              <SheetDescription className="text-ink-muted">{ordered.length} experiments match</SheetDescription>
              <div className="mt-4">{rail}</div>
            </SheetContent>
          </Sheet>

          <div role="group" aria-label="View" className="flex rounded-xl border border-line-strong p-1">
            {(["cards", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => update({ view: v })}
                aria-pressed={state.view === v}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors",
                  state.view === v ? "bg-white/[0.08] text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {v === "cards" ? <LayoutGrid className="size-4" strokeWidth={1.5} /> : <Rows3 className="size-4" strokeWidth={1.5} />}
                {v === "cards" ? "Cards" : "Table"}
              </button>
            ))}
          </div>
        </div>

        <h2 className="sr-only">Results</h2>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted" aria-live="polite">
          <span>
            <span className="font-mono text-ink tabular">{ordered.length}</span> of {rows.length} experiments
            {state.q ? (
              <>
                {" "}
                matching “{state.q}”{" "}
                <span className="text-xs">
                  ({searching ? "searching sources…" : semantic?.q === state.q.trim() && semantic.mode === "hybrid" ? "keyword + semantic" : "keyword"})
                </span>
              </>
            ) : null}
          </span>
          {missingDims ? <span className="text-xs">{missingDims} hidden because they state no range for that condition</span> : null}
          {active ? (
            <button
              type="button"
              onClick={() => update({ cat: [], plat: [], fuel: [], fac: [], yr: undefined, o2: undefined, p: undefined, flow: undefined, raw: false, ver: false })}
              className="text-xs text-flame-micro underline-offset-4 hover:underline"
            >
              Clear {active} filter{active === 1 ? "" : "s"}
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          {ordered.length === 0 ? (
            <EmptyState
              title={state.ver ? "No experiment records have been human-verified yet" : "No experiments match"}
              body={
                state.ver
                  ? "Verification happens in the team's review workflow. Turn off “Verified only” to see every record, each linked to its NASA source."
                  : "Try a broader search, or clear some filters. Condition filters only match experiments that state that range."
              }
              action={{
                label: "Clear search and filters",
                onClick: () => {
                  setQuery("");
                  router.replace(pathname, { scroll: false });
                },
              }}
            />
          ) : state.view === "cards" ? (
            <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {ordered.map((r) => (
                <li key={r.id}>
                  <ExperimentCard row={r} terms={terms} snippet={snippets.get(r.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <ExperimentTable rows={ordered} terms={terms} state={state} onSort={update} searching={Boolean(state.q)} />
          )}
        </div>
      </section>
    </div>
  );
}

function ExperimentCard({ row, terms, snippet }: { row: ExplorerRow; terms: string[]; snippet?: string }) {
  return (
    <Link
      href={`/experiments/${row.id}`}
      className="group flex h-full flex-col rounded-2xl border border-line bg-elev-1 p-5 transition-[border-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-px hover:border-white/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-ink-muted tabular">
            {row.platform} · {row.start}
            {row.end !== row.start ? `-${row.end}` : ""}
          </p>
          <h3 className="mt-1.5 text-lg font-medium text-ink">
            <Highlight text={row.acronym} terms={terms} />
          </h3>
          <p className="mt-0.5 text-sm text-ink-muted">
            <Highlight text={row.fullName} terms={terms} />
          </p>
        </div>
        {row.kind === "ground" ? (
          <span className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-ink-muted">Ground</span>
        ) : null}
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted">
        <Highlight text={row.summary} terms={terms} />
      </p>
      {snippet && terms.length ? (
        <p className="mt-3 line-clamp-2 border-l-2 border-flame-micro/40 pl-3 text-xs leading-relaxed text-ink-muted">
          <span className="text-ink-faint">From a source: </span>…<Highlight text={snippet} terms={terms} />…
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
        {row.category.map((c) => (
          <span key={c} className="rounded-full border border-line-strong px-2 py-0.5 text-[11px] text-ink-muted">
            {CATEGORY_LABEL[c]}
          </span>
        ))}
        <span className="ml-auto font-mono text-xs text-ink-muted tabular">
          {plural(row.findings, "finding")} · {plural(row.testPoints, "point")} · {plural(row.sources, "source")}
        </span>
      </div>
    </Link>
  );
}

function ExperimentTable({
  rows,
  terms,
  state,
  onSort,
  searching,
}: {
  rows: ExplorerRow[];
  terms: string[];
  state: ExplorerState;
  onSort: (p: Partial<ExplorerState>) => void;
  searching: boolean;
}) {
  const header = (id: string, label: string, numeric = false) => {
    const active = !searching && state.sort === id;
    return (
      <th
        scope="col"
        aria-sort={active ? (state.dir === "asc" ? "ascending" : "descending") : "none"}
        className={cn("sticky top-0 z-10 bg-elev-2 px-3 py-2.5 font-medium", numeric && "text-right")}
      >
        <button
          type="button"
          onClick={() => onSort({ sort: id, dir: active && state.dir === "desc" ? "asc" : "desc" })}
          className={cn("inline-flex items-center gap-1 text-xs hover:text-ink", active ? "text-ink" : "text-ink-muted")}
        >
          {label}
          {active ? (
            state.dir === "asc" ? (
              <ArrowUp className="size-3" strokeWidth={1.5} aria-hidden />
            ) : (
              <ArrowDown className="size-3" strokeWidth={1.5} aria-hidden />
            )
          ) : null}
        </button>
      </th>
    );
  };
  return (
    <div className="max-h-[70dvh] overflow-auto rounded-2xl border border-line">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <caption className="sr-only">Experiments{searching ? " ordered by search relevance" : ""}</caption>
        <thead className="text-ink-muted">
          <tr className="border-b border-line">
            {header("acronym", "Experiment")}
            {header("platform", "Platform")}
            {header("start", "Years")}
            <th scope="col" className="sticky top-0 z-10 bg-elev-2 px-3 py-2.5 text-xs font-medium">
              Categories
            </th>
            {header("findings", "Findings", true)}
            {header("testPoints", "Test points", true)}
            {header("sources", "Sources", true)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.03]">
              <td className="px-3 py-2.5">
                <Link href={`/experiments/${r.id}`} className="font-medium text-ink hover:underline">
                  <Highlight text={r.acronym} terms={terms} />
                </Link>
                <span className="block max-w-[26ch] truncate text-xs text-ink-muted">{r.fullName}</span>
              </td>
              <td className="px-3 py-2.5 text-ink-muted">{r.platform}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-ink-muted tabular">
                {r.start}
                {r.end !== r.start ? `-${r.end}` : ""}
              </td>
              <td className="px-3 py-2.5 text-xs text-ink-muted">{r.category.map((c) => CATEGORY_LABEL[c]).join(", ")}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular">{r.findings}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular">{r.testPoints}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular">{r.sources}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
