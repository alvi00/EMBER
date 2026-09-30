import { CATEGORY_META } from "@/components/ember/badges";
import type { FindingCategory } from "@/lib/schema";

export type CategoryDatum = { category: FindingCategory; count: number; total: number };

/**
 * Findings by category (one series → one colour, no legend). Counts findings the mission rates ≥ 2 of 3 for relevance.
 * Plain HTML bars instead of a chart library: the same encoding with no client JavaScript. Bars are thin, anchored to
 * the baseline with a 4 px rounded data end, labelled directly; zero rows keep a 1 px stub and a "0" label. Hovering a
 * row shows "n relevant of N findings"; keyboard and screen-reader users get the same numbers from the table.
 */
export function CategoryBars({ data }: { data: CategoryDatum[] }) {
  const rows = [...data].sort((a, b) => b.count - a.count || b.total - a.total);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div>
      <div role="img" aria-label="Findings by category for the selected mission" className="flex flex-col py-1">
        {rows.map((r) => (
          <div
            key={r.category}
            className="group relative flex h-[30px] items-center gap-2 rounded-md hover:bg-white/[0.04]"
            aria-hidden
          >
            <span className="text-ink-muted w-32 shrink-0 pr-1 text-right text-xs leading-tight">
              {CATEGORY_META[r.category].label}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5 pr-2">
              <span
                className="bg-viz-micro h-3.5 min-w-px rounded-r"
                style={{ width: `calc((100% - 2.25rem) * ${r.count / max})` }}
              />
              <span className="text-ink tabular font-mono text-xs">{r.count}</span>
            </span>
            <span className="border-line-strong bg-elev-3 text-ink pointer-events-none absolute top-full left-32 z-10 mt-1 hidden rounded-lg border px-3 py-2 text-xs whitespace-nowrap shadow-lg group-hover:block">
              <span className="block font-medium">{CATEGORY_META[r.category].label}</span>
              <span className="text-ink-muted tabular mt-1 block font-mono">
                {r.count} relevant of {r.total} findings
              </span>
            </span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Findings by category</caption>
        <thead>
          <tr>
            <th>Category</th>
            <th>Relevant findings</th>
            <th>All findings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category}>
              <td>{CATEGORY_META[r.category].label}</td>
              <td>{r.count}</td>
              <td>{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
