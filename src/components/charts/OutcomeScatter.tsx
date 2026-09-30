"use client";

import { useMemo } from "react";
import { scaleLinear, scaleLog } from "d3";
import { HoverTooltip, useHoverTooltip } from "@/components/charts/HoverTooltip";
import type { Measurement } from "@/lib/schema";

export type ScatterAxis = {
  key: "o2Percent" | "pressureKpa" | "flowCmS" | "gravityG";
  label: string;
  unit: string;
  log?: boolean;
};

export const AXES: Record<ScatterAxis["key"], ScatterAxis> = {
  o2Percent: { key: "o2Percent", label: "Oxygen", unit: "% O2" },
  pressureKpa: { key: "pressureKpa", label: "Pressure", unit: "kPa" },
  flowCmS: { key: "flowCmS", label: "Flow", unit: "cm/s" },
  gravityG: { key: "gravityG", label: "Gravity", unit: "g" },
};

/** Outcome encoding: colour AND shape (never colour alone). Burned = amber circle; not burning = blue shapes. */
export const OUTCOME_STYLE: Record<Measurement["outcome"], { label: string; color: string; shape: "circle" | "triangle" | "square" | "diamond" }> = {
  burned: { label: "Burned", color: "var(--viz-earth)", shape: "circle" },
  "self-extinguished": { label: "Self-extinguished", color: "var(--viz-micro)", shape: "triangle" },
  "no-ignition": { label: "No ignition", color: "var(--viz-micro)", shape: "square" },
  "extinguished-by-agent": { label: "Extinguished by agent", color: "var(--viz-micro)", shape: "diamond" },
};

export function Marker({ shape, color, size = 9, hollow = false }: { shape: string; color: string; size?: number; hollow?: boolean }) {
  const r = size / 2;
  const common = { fill: hollow ? "var(--bg-elev-1)" : color, stroke: hollow ? color : "var(--bg-elev-1)", strokeWidth: hollow ? 2 : 1.5 };
  if (shape === "triangle") return <path d={`M0 ${-r * 1.15} L${r * 1.05} ${r * 0.8} L${-r * 1.05} ${r * 0.8} Z`} {...common} />;
  if (shape === "square") return <rect x={-r * 0.85} y={-r * 0.85} width={r * 1.7} height={r * 1.7} rx={1.5} {...common} fill="var(--bg-elev-1)" stroke={color} strokeWidth={2} />;
  if (shape === "diamond") return <path d={`M0 ${-r * 1.2} L${r * 1.2} 0 L0 ${r * 1.2} L${-r * 1.2} 0 Z`} {...common} />;
  return <circle r={r} {...common} />;
}

export function OutcomeLegend({ outcomes }: { outcomes: Measurement["outcome"][] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted" aria-label="Legend">
      {outcomes.map((o) => (
        <li key={o} className="flex items-center gap-1.5">
          <svg width={14} height={14} viewBox="-7 -7 14 14" aria-hidden>
            <Marker shape={OUTCOME_STYLE[o].shape} color={OUTCOME_STYLE[o].color} />
          </svg>
          {OUTCOME_STYLE[o].label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Test-point scatter: x/y are condition axes, marks encode outcome by colour + shape. Points missing either value
 * are left out and counted. Optional `crosshair` draws the user's cabin (Risk Lens).
 */
export function OutcomeScatter({
  points,
  x,
  y,
  height = 280,
  crosshair,
  caption,
  sourceLabel,
}: {
  points: Measurement[];
  x: ScatterAxis;
  y: ScatterAxis;
  height?: number;
  crosshair?: { x: number; y: number; label: string };
  caption: string;
  sourceLabel?: (m: Measurement) => string;
}) {
  const { container, tip, show, hide } = useHoverTooltip();
  const W = 640;
  const M = { top: 12, right: 16, bottom: 40, left: 52 };
  const plotted = points.filter((p) => p[x.key] !== undefined && p[y.key] !== undefined);
  const omitted = points.length - plotted.length;

  const { sx, sy } = useMemo(() => {
    const xs = plotted.map((p) => p[x.key] as number).concat(crosshair ? [crosshair.x] : []);
    const ys = plotted.map((p) => p[y.key] as number).concat(crosshair ? [crosshair.y] : []);
    const ext = (vals: number[], log?: boolean): [number, number] => {
      let lo = Math.min(...vals);
      let hi = Math.max(...vals);
      if (log) {
        lo = Math.max(0.1, lo * 0.7);
        hi = hi * 1.3;
      } else {
        const pad = (hi - lo || Math.abs(hi) || 1) * 0.08;
        lo -= pad;
        hi += pad;
      }
      return [lo, hi];
    };
    const mk = (a: ScatterAxis, vals: number[], range: [number, number]) =>
      a.log && Math.min(...vals) > 0 ? scaleLog().domain(ext(vals, true)).range(range).nice() : scaleLinear().domain(ext(vals)).range(range).nice();
    return {
      sx: mk(x, xs.length ? xs : [0, 1], [M.left, W - M.right]),
      sy: mk(y, ys.length ? ys : [0, 1], [height - M.bottom, M.top]),
    };
  }, [plotted, x, y, crosshair, height, M.left, M.right, M.bottom, M.top]);

  const present = Array.from(new Set(plotted.map((p) => p.outcome)));
  // Log axes get 1-2-5 ticks so labels never crowd.
  const logTicks = (scale: typeof sx) => {
    const [a, b] = scale.domain() as [number, number];
    return [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].filter((t) => t >= Math.min(a, b) && t <= Math.max(a, b));
  };
  const xTicks = x.log ? logTicks(sx) : sx.ticks(6);
  const yTicks = y.log ? logTicks(sy) : sy.ticks(5);
  const fmt = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : Number(n.toPrecision(3)).toString());

  return (
    <figure ref={container} className="relative">
      <OutcomeLegend outcomes={present.length ? present : ["burned", "self-extinguished"]} />
      <svg viewBox={`0 0 ${W} ${height}`} className="mt-2 w-full" role="img" aria-label={caption}>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={M.left} x2={W - M.right} y1={sy(t)} y2={sy(t)} stroke="rgba(255,255,255,0.06)" />
            <text x={M.left - 8} y={sy(t) + 3} textAnchor="end" className="fill-ink-muted font-mono text-[10px]">
              {fmt(t)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={height - M.bottom + 16} textAnchor="middle" className="fill-ink-muted font-mono text-[10px]">
            {fmt(t)}
          </text>
        ))}
        <line x1={M.left} x2={W - M.right} y1={height - M.bottom} y2={height - M.bottom} stroke="rgba(255,255,255,0.18)" />
        <text x={(M.left + W - M.right) / 2} y={height - 6} textAnchor="middle" className="fill-ink-muted text-[11px]">
          {x.label} ({x.unit}){x.log ? ", log scale" : ""}
        </text>
        <text transform={`translate(12 ${(M.top + height - M.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="fill-ink-muted text-[11px]">
          {y.label} ({y.unit}){y.log ? ", log" : ""}
        </text>
        {crosshair ? (
          <g transform={`translate(${sx(crosshair.x)},${sy(crosshair.y)})`} aria-hidden>
            <circle r={16} fill="none" stroke="var(--flame-core)" strokeOpacity={0.5} className="motion-safe:animate-pulse" />
            <line x1={-22} x2={22} stroke="var(--flame-core)" strokeWidth={1.5} />
            <line y1={-22} y2={22} stroke="var(--flame-core)" strokeWidth={1.5} />
            <text
              x={sx(crosshair.x) > W - 120 ? -20 : 20}
              y={-18}
              textAnchor={sx(crosshair.x) > W - 120 ? "end" : "start"}
              className="fill-flame-core text-[11px]"
            >
              {crosshair.label}
            </text>
          </g>
        ) : null}
        {plotted.map((p) => {
          const st = OUTCOME_STYLE[p.outcome];
          const body = (
            <div>
              <p className="font-medium">{p.testId}</p>
              <p className="text-ink-muted">{p.fuel}</p>
              <p className="mt-1 font-mono tabular">
                {x.label} {p[x.key]} {x.unit} · {y.label} {p[y.key]} {y.unit}
              </p>
              <p className="mt-1">{st.label}{p.rawOutcome ? ` (${p.rawOutcome})` : ""}</p>
              {sourceLabel ? <p className="mt-1 text-ink-muted">{sourceLabel(p)}</p> : null}
            </div>
          );
          return (
            <g
              key={p.id}
              transform={`translate(${sx(p[x.key] as number)},${sy(p[y.key] as number)})`}
              tabIndex={0}
              role="img"
              aria-label={`${p.testId}: ${st.label}, ${x.label} ${p[x.key]} ${x.unit}, ${y.label} ${p[y.key]} ${y.unit}`}
              onMouseEnter={(e) => show(e.currentTarget, body)}
              onMouseLeave={hide}
              onFocus={(e) => show(e.currentTarget, body)}
              onBlur={hide}
              className="cursor-default outline-none focus-visible:[&>*]:stroke-flame-core"
            >
              <circle r={10} fill="transparent" />
              <Marker shape={st.shape} color={st.color} />
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-xs text-ink-muted">
        {caption}
        {omitted ? ` ${omitted} test point${omitted === 1 ? "" : "s"} without both values ${omitted === 1 ? "is" : "are"} not plotted.` : ""}
      </figcaption>
      <HoverTooltip tip={tip} />
    </figure>
  );
}
