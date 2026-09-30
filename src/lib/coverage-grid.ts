import type { Measurement } from "@/lib/schema";

/** Coarse evidence-coverage grid (gravity × O2) used by Mission Control's mini-heatmap and the Risk Lens. */
export const GRAVITY_ROWS = [
  { id: "zero", label: "0 g", g: 0, min: -0.01, max: 0.05 },
  { id: "moon", label: "Moon", g: 0.166, min: 0.05, max: 0.27 },
  { id: "mars", label: "Mars", g: 0.38, min: 0.27, max: 0.6 },
  { id: "earth", label: "1 g", g: 1, min: 0.6, max: 1.5 },
] as const;

export const O2_BINS = [
  { id: "lt18", label: "<18%", min: 0, max: 18 },
  { id: "18", label: "18-21%", min: 18, max: 21 },
  { id: "21", label: "21-24%", min: 21, max: 24 },
  { id: "24", label: "24-27%", min: 24, max: 27 },
  { id: "27", label: "27-30%", min: 27, max: 30 },
  { id: "30", label: "≥30%", min: 30, max: 101 },
] as const;

export type CoverageCell = {
  row: string;
  col: string;
  count: number;
  burned: number;
  extinguished: number;
  experiments: string[];
};

export function gravityRowFor(g: number) {
  return GRAVITY_ROWS.find((r) => g >= r.min && g < r.max) ?? GRAVITY_ROWS[GRAVITY_ROWS.length - 1];
}

export function o2BinFor(o2: number) {
  return O2_BINS.find((b) => o2 >= b.min && o2 < b.max) ?? O2_BINS[O2_BINS.length - 1];
}

/** Count test points with a known O2 per cell. Rows without an O2 value cannot be placed and are skipped. */
export function buildCoverageGrid(measurements: Measurement[]): CoverageCell[] {
  const cells = new Map<string, CoverageCell>();
  for (const r of GRAVITY_ROWS) {
    for (const b of O2_BINS) {
      cells.set(`${r.id}|${b.id}`, { row: r.id, col: b.id, count: 0, burned: 0, extinguished: 0, experiments: [] });
    }
  }
  for (const m of measurements) {
    if (m.o2Percent === undefined) continue;
    const cell = cells.get(`${gravityRowFor(m.gravityG).id}|${o2BinFor(m.o2Percent).id}`)!;
    cell.count += 1;
    if (m.outcome === "burned") cell.burned += 1;
    else cell.extinguished += 1;
    if (!cell.experiments.includes(m.experimentId)) cell.experiments.push(m.experimentId);
  }
  return Array.from(cells.values());
}
