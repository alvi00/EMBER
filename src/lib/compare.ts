import type { Experiment, Measurement } from "@/lib/schema";

/** /compare helpers (project.md §7.10): 2–3 experiments side by side. Pure functions, unit-testable. */

export const MAX_COMPARE = 3;
export const COMPARE_COLORS = ["var(--viz-cmp-1)", "var(--viz-cmp-2)", "var(--viz-cmp-3)"] as const;
export const COMPARE_LETTERS = ["A", "B", "C"] as const;

/** Parse `?ids=a,b,c`: known ids only, no duplicates, at most three, order kept. */
export function parseCompareIds(raw: string | string[] | undefined, known: Set<string>): string[] {
  const text = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  const out: string[] = [];
  for (const id of text.split(",").map((s) => s.trim().toLowerCase())) {
    if (id && known.has(id) && !out.includes(id)) out.push(id);
    if (out.length === MAX_COMPARE) break;
  }
  return out;
}

export type CompareDim = "gravityG" | "o2Percent" | "pressureKpa" | "flowCmS";

export const COMPARE_DIMS: { key: CompareDim; label: string; unit: string; scale: "linear" | "log" | "log1p" }[] = [
  { key: "gravityG", label: "Gravity", unit: "g", scale: "linear" },
  { key: "o2Percent", label: "Oxygen", unit: "% O2", scale: "linear" },
  { key: "pressureKpa", label: "Pressure", unit: "kPa", scale: "log" },
  { key: "flowCmS", label: "Flow", unit: "cm/s", scale: "log1p" },
];

const transform = (scale: "linear" | "log" | "log1p", v: number) =>
  scale === "log" ? Math.log(Math.max(v, 1e-3)) : scale === "log1p" ? Math.log1p(Math.max(v, 0)) : v;

export type Domain = { min: number; max: number };

/** Dataset-wide extent of each condition over all experiments' stated ranges (gravity always 0–1 g). */
export function compareDomains(all: Experiment[]): Record<CompareDim, Domain | null> {
  const out = {} as Record<CompareDim, Domain | null>;
  for (const d of COMPARE_DIMS) {
    if (d.key === "gravityG") {
      out[d.key] = { min: 0, max: 1 };
      continue;
    }
    const vals = all.flatMap((e) => {
      const r = e.conditions[d.key];
      return r ? [r.min, r.max] : [];
    });
    out[d.key] = vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : null;
  }
  return out;
}

/** Position of a value on a 0–1 track for the dimension's scale. */
export function position(dim: (typeof COMPARE_DIMS)[number], domain: Domain, v: number): number {
  const lo = transform(dim.scale, domain.min);
  const hi = transform(dim.scale, domain.max);
  if (hi === lo) return 0.5;
  return Math.min(1, Math.max(0, (transform(dim.scale, v) - lo) / (hi - lo)));
}

export type OutcomeCounts = { total: number; burned: number; selfExtinguished: number; noIgnition: number; extinguishedByAgent: number };

export function outcomeCounts(points: Measurement[]): OutcomeCounts {
  return {
    total: points.length,
    burned: points.filter((p) => p.outcome === "burned").length,
    selfExtinguished: points.filter((p) => p.outcome === "self-extinguished").length,
    noIgnition: points.filter((p) => p.outcome === "no-ignition").length,
    extinguishedByAgent: points.filter((p) => p.outcome === "extinguished-by-agent").length,
  };
}
