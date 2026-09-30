"use client";

import { HoverTooltip, useHoverTooltip } from "@/components/charts/HoverTooltip";
import { GRAVITY_ROWS, O2_BINS, type CoverageCell } from "@/lib/coverage-grid";
import { plural } from "@/lib/text";
import { cn } from "@/lib/utils";

const SEQ = ["var(--viz-seq-1)", "var(--viz-seq-2)", "var(--viz-seq-3)", "var(--viz-seq-4)", "var(--viz-seq-5)"];

function bucket(count: number): number {
  if (count <= 2) return 0;
  if (count <= 6) return 1;
  if (count <= 20) return 2;
  if (count <= 60) return 3;
  return 4;
}

/**
 * Evidence-coverage mini-heatmap: test points per (gravity level × O2 band). Single-hue sequential scale; empty
 * cells are hatched ("no data", never colour alone); the mission's cabin cell carries a ring + label.
 */
export function CoverageHeatmap({
  cells,
  missionCell,
  experimentLabel,
  compact = false,
}: {
  cells: CoverageCell[];
  missionCell?: { row: string; col: string };
  experimentLabel: (id: string) => string;
  compact?: boolean;
}) {
  const { container, tip, show, hide } = useHoverTooltip();
  const at = (row: string, col: string) => cells.find((c) => c.row === row && c.col === col)!;

  return (
    <div ref={container} className="relative">
      <div
        role="table"
        aria-label="Test points by gravity level and oxygen band"
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `${compact ? "3.5rem" : "4.5rem"} repeat(${O2_BINS.length}, minmax(0, 1fr))` }}
      >
        <div role="row" className="contents">
          <span role="columnheader" className="pb-1 font-mono text-[10px] text-ink-muted">
            <span className="sr-only">Gravity / </span>O2
          </span>
          {O2_BINS.map((b) => (
            <span role="columnheader" key={b.id} className="pb-1 text-center font-mono text-[10px] text-ink-muted">
              {b.label}
            </span>
          ))}
        </div>
        {[...GRAVITY_ROWS].reverse().map((r) => (
          <div role="row" key={r.id} className="contents">
            <span role="rowheader" className="flex items-center font-mono text-[11px] text-ink-muted">
              {r.label}
            </span>
            {O2_BINS.map((b) => {
              const c = at(r.id, b.id);
              const isMission = missionCell?.row === r.id && missionCell.col === b.id;
              const label = `${r.label}, O2 ${b.label}: ${c.count === 0 ? "no data" : `${c.count} test points`}`;
              const body = (
                <div>
                  <p className="font-medium">
                    {r.label} · O2 {b.label}
                    {isMission ? " · your cabin" : ""}
                  </p>
                  {c.count === 0 ? (
                    <p className="mt-1 text-ink-muted">No test points. Any estimate here is an extrapolation.</p>
                  ) : (
                    <>
                      <p className="mt-1 font-mono tabular">
                        {plural(c.count, "point")} · {c.burned} burned · {c.extinguished} extinguished / no ignition
                      </p>
                      <p className="mt-1 text-ink-muted">{c.experiments.map(experimentLabel).join(", ")}</p>
                    </>
                  )}
                </div>
              );
              return (
                <span
                  role="cell"
                  key={b.id}
                  tabIndex={0}
                  aria-label={label + (isMission ? " (your mission's cabin)" : "")}
                  onMouseEnter={(e) => show(e.currentTarget, body)}
                  onMouseLeave={hide}
                  onFocus={(e) => show(e.currentTarget, body)}
                  onBlur={hide}
                  className={cn(
                    "relative flex items-center justify-center rounded-md font-mono text-[11px] tabular outline-none focus-visible:ring-2 focus-visible:ring-flame-micro",
                    compact ? "h-8" : "h-10",
                    c.count === 0 ? "hatch bg-elev-2 text-ink-faint" : bucket(c.count) >= 3 ? "text-canvas" : "text-ink",
                  )}
                  style={c.count ? { background: SEQ[bucket(c.count)] } : undefined}
                >
                  {c.count || ""}
                  {isMission ? (
                    <span aria-hidden className="absolute -inset-[3px] rounded-lg ring-2 ring-flame-core" />
                  ) : null}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          Fewer
          {SEQ.map((c) => (
            <span key={c} aria-hidden className="inline-block h-2.5 w-3.5 rounded-[2px]" style={{ background: c }} />
          ))}
          More test points
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="hatch inline-block h-2.5 w-3.5 rounded-[2px] bg-elev-2" /> No data
        </span>
        {missionCell ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2.5 w-3.5 rounded-[2px] ring-2 ring-flame-core" /> Your cabin
          </span>
        ) : null}
      </div>
      <HoverTooltip tip={tip} />
    </div>
  );
}
