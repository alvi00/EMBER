import type { Measurement } from "@/lib/schema";

/**
 * Evidence-coverage metric (project.md §9.6).
 *
 * Each condition dimension is normalised to [0, 1] over the dataset range — log scale for flow (log1p, so 0 cm/s is
 * valid) and pressure. Distance is a weighted Euclidean over the dimensions that BOTH the query and the test point
 * state; dimensions a point does not state are skipped and reported. Thresholds:
 *   d < 0.05 → "direct"      (directly tested)
 *   d < 0.15 → "near"        (near tested conditions)
 *   else     → "extrapolation" (no direct evidence)
 * A gravity mismatch (e.g. tested at 0 g, asked at 0.17 g) can never be "direct": it is forced to at least "near"
 * and carries a partial-gravity warning.
 */

export type Dim = "gravityG" | "o2Percent" | "pressureKpa" | "flowCmS";
export const DIMS: Dim[] = ["gravityG", "o2Percent", "pressureKpa", "flowCmS"];

export type Query = { gravityG: number; o2Percent?: number; pressureKpa?: number; flowCmS?: number };
export type Weights = Record<Dim, number>;
export const DEFAULT_DIM_WEIGHTS: Weights = { gravityG: 1, o2Percent: 1, pressureKpa: 1, flowCmS: 1 };

export const THRESHOLDS = { direct: 0.05, near: 0.15 } as const;
export const GRAVITY_TOLERANCE = 0.02;

export type Verdict = "direct" | "near" | "extrapolation";

export const VERDICT_LABEL: Record<Verdict, string> = {
  direct: "Directly tested",
  near: "Near tested conditions",
  extrapolation: "Extrapolation, no direct evidence",
};

type Transform = { fn: (v: number) => number; min: number; max: number };
export type Normaliser = Record<Dim, Transform | null>;

const LOG_DIMS: Partial<Record<Dim, (v: number) => number>> = {
  pressureKpa: (v) => Math.log(Math.max(v, 1e-3)),
  flowCmS: (v) => Math.log1p(Math.max(v, 0)),
};

/** Build the per-dimension normaliser from the dataset (gravity always spans 0-1 g). */
export function buildNormaliser(points: Measurement[]): Normaliser {
  const out = {} as Normaliser;
  for (const d of DIMS) {
    const fn = LOG_DIMS[d] ?? ((v: number) => v);
    if (d === "gravityG") {
      out[d] = { fn, min: 0, max: 1 };
      continue;
    }
    const vals = points.map((p) => p[d]).filter((v): v is number => typeof v === "number").map(fn);
    if (!vals.length) {
      out[d] = null;
      continue;
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    out[d] = { fn, min, max: max > min ? max : min + 1 };
  }
  return out;
}

export function normalise(n: Normaliser, d: Dim, v: number): number | null {
  const t = n[d];
  if (!t) return null;
  return Math.min(1.5, Math.max(-0.5, (t.fn(v) - t.min) / (t.max - t.min)));
}

export type Neighbour = {
  point: Measurement;
  distance: number;
  usedDims: Dim[];
  skippedDims: Dim[];
  gravityMismatch: boolean;
};

export function distance(
  q: Query,
  p: Measurement,
  n: Normaliser,
  w: Weights = DEFAULT_DIM_WEIGHTS,
): { distance: number; usedDims: Dim[]; skippedDims: Dim[] } {
  let num = 0;
  let den = 0;
  const used: Dim[] = [];
  const skipped: Dim[] = [];
  for (const d of DIMS) {
    const qv = q[d];
    if (qv === undefined) continue;
    const pv = p[d];
    if (pv === undefined) {
      skipped.push(d);
      continue;
    }
    const a = normalise(n, d, qv);
    const b = normalise(n, d, pv);
    if (a === null || b === null) {
      skipped.push(d);
      continue;
    }
    num += w[d] * (a - b) ** 2;
    den += w[d];
    used.push(d);
  }
  return { distance: den > 0 ? Math.sqrt(num / den) : Number.POSITIVE_INFINITY, usedDims: used, skippedDims: skipped };
}

export type CoverageResult = {
  verdict: Verdict;
  nearest: Neighbour[];
  best?: Neighbour;
  warnings: string[];
  /** Query dimensions no test point in scope states at all. */
  unmatchedDims: Dim[];
  pointsInScope: number;
};

/** Assess how well a query condition is covered by tested points (already filtered to the fuel family in scope). */
export function assessCoverage(q: Query, points: Measurement[], opts: { k?: number; normaliser?: Normaliser } = {}): CoverageResult {
  const { k = 5 } = opts;
  const n = opts.normaliser ?? buildNormaliser(points);
  const warnings: string[] = [];

  const neighbours: Neighbour[] = points
    .map((p) => {
      const d = distance(q, p, n);
      return { point: p, ...d, gravityMismatch: Math.abs(p.gravityG - q.gravityG) > GRAVITY_TOLERANCE };
    })
    .filter((x) => Number.isFinite(x.distance))
    .sort((a, b) => a.distance - b.distance || a.point.id.localeCompare(b.point.id));

  const unmatchedDims = DIMS.filter((d) => q[d] !== undefined && !points.some((p) => p[d] !== undefined));
  if (!neighbours.length) {
    warnings.push("No tested points share any of your conditions for this material family.");
    return { verdict: "extrapolation", nearest: [], warnings, unmatchedDims, pointsInScope: points.length };
  }

  const best = neighbours[0];
  let verdict: Verdict = best.distance < THRESHOLDS.direct ? "direct" : best.distance < THRESHOLDS.near ? "near" : "extrapolation";

  if (best.gravityMismatch && verdict === "direct") verdict = "near";
  const sameGravity = points.some((p) => Math.abs(p.gravityG - q.gravityG) <= GRAVITY_TOLERANCE);
  if (!sameGravity) {
    const tested = Array.from(new Set(points.map((p) => p.gravityG))).sort((a, b) => a - b);
    warnings.push(
      `No test at ${q.gravityG.toFixed(2)} g for this material family (tested at ${tested.map((g) => `${g} g`).join(", ")}). Partial-gravity behaviour cannot be read off 0 g or 1 g data: some materials burn at lower oxygen in partial gravity.`,
    );
  } else if (best.gravityMismatch) {
    warnings.push(`The closest test was at ${best.point.gravityG} g, not ${q.gravityG.toFixed(2)} g.`);
  }
  if (best.skippedDims.length) {
    warnings.push(`The closest test does not state ${best.skippedDims.map(dimLabel).join(" or ")}; that condition was not compared.`);
  }
  for (const d of unmatchedDims) warnings.push(`No test point in scope states ${dimLabel(d)}.`);

  return { verdict, nearest: neighbours.slice(0, k), best, warnings, unmatchedDims, pointsInScope: points.length };
}

export function dimLabel(d: Dim): string {
  return { gravityG: "gravity", o2Percent: "oxygen level", pressureKpa: "pressure", flowCmS: "flow speed" }[d];
}
