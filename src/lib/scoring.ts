import type { Finding, MissionId } from "@/lib/schema";

/**
 * Insight Score (project.md §9.5), fully transparent:
 *
 *   score(f, mission, w) = 100 × ( w.sev·norm(severity) + w.app·(missionRelevance[mission] / 3)
 *                                + w.evd·norm(evidenceStrength) + w.act·norm(actionability) ) / Σw
 *   norm(x) = (x − 1) / 4 for the 1–5 scales
 *   AI-draft findings × 0.7 (and badged); rejected findings are never scored or shown.
 *   All-zero (or invalid) weights fall back to the defaults.
 */
export type Weights = { sev: number; app: number; evd: number; act: number };

export const DEFAULT_WEIGHTS: Weights = { sev: 0.35, app: 0.3, evd: 0.2, act: 0.15 };
export const DRAFT_PENALTY = 0.7;

export const WEIGHT_LABELS: Record<keyof Weights, string> = {
  sev: "Severity",
  app: "Mission applicability",
  evd: "Evidence strength",
  act: "Actionability",
};

export const norm15 = (x: number) => (Math.min(5, Math.max(1, x)) - 1) / 4;

export function resolveWeights(w: Partial<Weights> | undefined | null): Weights {
  const merged = { ...DEFAULT_WEIGHTS, ...(w ?? {}) };
  const values = Object.values(merged);
  const valid = values.every((v) => Number.isFinite(v) && v >= 0);
  const total = values.reduce((a, b) => a + b, 0);
  return valid && total > 0 ? merged : { ...DEFAULT_WEIGHTS };
}

export type ScoreBreakdown = {
  /** Contribution of each factor in points (after normalisation by Σw, before the draft penalty). */
  parts: Record<keyof Weights, number>;
  raw: number;
  penalty: number;
  score: number;
};

export function scoreBreakdown(f: Finding, mission: MissionId, weights?: Partial<Weights>): ScoreBreakdown | null {
  if (f.status === "rejected") return null;
  const w = resolveWeights(weights);
  const total = w.sev + w.app + w.evd + w.act;
  const factor = {
    sev: norm15(f.severity),
    app: Math.min(3, Math.max(0, f.missionRelevance[mission])) / 3,
    evd: norm15(f.evidenceStrength),
    act: norm15(f.actionability),
  };
  const parts = {
    sev: (100 * w.sev * factor.sev) / total,
    app: (100 * w.app * factor.app) / total,
    evd: (100 * w.evd * factor.evd) / total,
    act: (100 * w.act * factor.act) / total,
  };
  const raw = parts.sev + parts.app + parts.evd + parts.act;
  const penalty = f.status === "ai-draft" ? DRAFT_PENALTY : 1;
  return { parts, raw, penalty, score: raw * penalty };
}

export function scoreFinding(f: Finding, mission: MissionId, weights?: Partial<Weights>): number | null {
  return scoreBreakdown(f, mission, weights)?.score ?? null;
}

export type RankedFinding = { finding: Finding; score: number; breakdown: ScoreBreakdown; rank: number };

/** Rank findings for a mission. Ties break on evidence strength, then severity, then id (stable). */
export function rankFindings(findings: Finding[], mission: MissionId, weights?: Partial<Weights>): RankedFinding[] {
  return findings
    .map((finding) => {
      const breakdown = scoreBreakdown(finding, mission, weights);
      return breakdown ? { finding, score: breakdown.score, breakdown } : null;
    })
    .filter((x): x is { finding: Finding; score: number; breakdown: ScoreBreakdown } => x !== null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.finding.evidenceStrength - a.finding.evidenceStrength ||
        b.finding.severity - a.finding.severity ||
        a.finding.id.localeCompare(b.finding.id),
    )
    .map((x, i) => ({ ...x, rank: i + 1 }));
}
