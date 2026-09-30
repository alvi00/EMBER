"use client";

import { useMemo } from "react";
import Link from "next/link";
import { scaleLinear } from "d3";
import { HoverTooltip, useHoverTooltip } from "@/components/charts/HoverTooltip";
import type { TimelineRow } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

const ROW = 18;
const LABEL_W = 132;
const REGIME = {
  micro: { label: "Microgravity (0 g)", color: "var(--viz-micro)" },
  partial: { label: "Partial gravity", color: "var(--viz-partial)" },
  ground: { label: "Ground re-analysis", color: "var(--viz-neutral)" },
} as const;

/**
 * Experiment timeline: one row per investigation, grouped by platform; bar colour encodes the gravity regime
 * (validated blue/amber pair; ground rows are grey with hatching). Rows relevant to the mission stay bright.
 */
export function ExperimentTimeline({
  rows,
  highlight,
  width = 760,
}: {
  rows: TimelineRow[];
  highlight?: Set<string>;
  width?: number;
}) {
  const { container, tip, show, hide } = useHoverTooltip();
  const minYear = Math.min(...rows.map((r) => r.start));
  const maxYear = Math.max(2026, ...rows.map((r) => r.end));
  const plotW = width - LABEL_W - 12;

  const groups = useMemo(() => {
    const out: { platform: string; rows: TimelineRow[] }[] = [];
    for (const r of rows) {
      const last = out[out.length - 1];
      if (last && last.platform === r.platform) last.rows.push(r);
      else out.push({ platform: r.platform, rows: [r] });
    }
    return out;
  }, [rows]);

  const x = scaleLinear().domain([minYear, maxYear + 1]).range([0, plotW]);
  const ticks = x.ticks(6).filter((t) => Number.isInteger(t));
  let y = 22;
  const layout = groups.map((g) => {
    const top = y;
    y += 16 + g.rows.length * ROW + 6;
    return { ...g, top };
  });
  const height = y + 4;

  return (
    <div ref={container} className="relative">
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-label="Legend">
        {Object.entries(REGIME).map(([k, v]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn("inline-block h-2.5 w-4 rounded-[3px]", k === "ground" && "hatch")}
              style={{ background: k === "ground" ? undefined : v.color, backgroundColor: k === "ground" ? "rgba(138,144,162,0.35)" : undefined }}
            />
            {v.label}
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block max-w-none" role="group" aria-label="Timeline of investigations by platform">
          <defs>
            <pattern id="tl-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="rgba(138,144,162,0.28)" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(138,144,162,0.75)" strokeWidth="2" />
            </pattern>
          </defs>
          <g transform={`translate(${LABEL_W},0)`}>
            {ticks.map((t) => (
              <g key={t} transform={`translate(${x(t)},0)`}>
                <line y1={16} y2={height} stroke="rgba(255,255,255,0.06)" />
                <text y={10} textAnchor="middle" className="fill-ink-muted font-mono text-[10px]">
                  {t}
                </text>
              </g>
            ))}
          </g>
          {layout.map((g) => (
            <g key={g.platform} transform={`translate(0,${g.top})`}>
              <text x={0} y={10} className="fill-ink-muted text-[10px] font-medium tracking-wide uppercase">
                {g.platform}
              </text>
              {g.rows.map((r, i) => {
                const yy = 16 + i * ROW;
                const x0 = x(r.start);
                const x1 = x(r.end + 1);
                const dim = highlight && !highlight.has(r.id);
                const color = REGIME[r.regime].color;
                return (
                  <Link
                    key={r.id}
                    href={`/experiments/${r.id}`}
                    aria-label={`${r.acronym}: ${r.platform}, ${r.start}${r.end !== r.start ? `-${r.end}` : ""}${r.open ? " (end not stated)" : ""}`}
                    onMouseEnter={(e) => show(e.currentTarget, <TipBody r={r} />)}
                    onMouseLeave={hide}
                    onFocus={(e) => show(e.currentTarget, <TipBody r={r} />)}
                    onBlur={hide}
                    className="outline-none focus-visible:[&_rect.mark]:stroke-flame-micro"
                  >
                    <g transform={`translate(0,${yy})`} opacity={dim ? 0.35 : 1}>
                      <rect x={0} y={0} width={width} height={ROW} fill="transparent" />
                      <text x={8} y={12} className="fill-ink text-[11px]">
                        {r.acronym.length > 20 ? `${r.acronym.slice(0, 19)}…` : r.acronym}
                      </text>
                      <rect
                        className="mark"
                        x={LABEL_W + x0}
                        y={4}
                        width={Math.max(4, x1 - x0)}
                        height={ROW - 8}
                        rx={3}
                        fill={r.regime === "ground" ? "url(#tl-hatch)" : color}
                        strokeWidth={2}
                      />
                      {r.open ? (
                        <rect x={LABEL_W + x1} y={4} width={10} height={ROW - 8} rx={3} fill={color} opacity={0.3} />
                      ) : null}
                    </g>
                  </Link>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      <HoverTooltip tip={tip} />
    </div>
  );
}

function TipBody({ r }: { r: TimelineRow }) {
  return (
    <div>
      <p className="font-medium">{r.acronym}</p>
      <p className="mt-0.5 text-ink-muted">{r.fullName}</p>
      <p className="mt-1 font-mono text-ink-muted tabular">
        {r.platform} · {r.start}
        {r.end !== r.start ? `-${r.end}` : ""}
        {r.open ? " (end not stated)" : ""}
      </p>
      <p className="mt-1 text-ink-muted">
        {r.findingIds.length} finding{r.findingIds.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
