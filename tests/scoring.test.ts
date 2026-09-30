import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHTS,
  DRAFT_PENALTY,
  rankFindings,
  resolveWeights,
  scoreBreakdown,
  scoreFinding,
} from "@/lib/scoring";
import type { Finding } from "@/lib/schema";

function finding(partial: Partial<Finding> & { id: string }): Finding {
  return {
    experimentId: "exp",
    statement: "s",
    plainLanguage: "p",
    category: "flame-spread",
    safetyImplication: "i",
    evidence: [{ sourceId: "src", chunkId: "src:p1:c0", excerpt: "e" }],
    missionRelevance: { iss: 3, gateway: 3, lunar: 3, marsTransit: 3, marsSurface: 3 },
    severity: 5,
    actionability: 5,
    evidenceStrength: 5,
    confidence: "high",
    status: "verified",
    ...partial,
  };
}

describe("scoreFinding", () => {
  it("scores a maximal verified finding at 100 and a minimal one at 0", () => {
    expect(scoreFinding(finding({ id: "max" }), "lunar")).toBeCloseTo(100);
    const min = finding({
      id: "min",
      severity: 1,
      actionability: 1,
      evidenceStrength: 1,
      missionRelevance: { iss: 0, gateway: 0, lunar: 0, marsTransit: 0, marsSurface: 0 },
    });
    expect(scoreFinding(min, "lunar")).toBeCloseTo(0);
  });

  it("applies the AI-draft penalty and never scores rejected findings", () => {
    expect(scoreFinding(finding({ id: "d", status: "ai-draft" }), "iss")).toBeCloseTo(100 * DRAFT_PENALTY);
    expect(scoreFinding(finding({ id: "r", status: "rejected" }), "iss")).toBeNull();
  });

  it("uses mission relevance for the applicability term", () => {
    const f = finding({
      id: "m",
      missionRelevance: { iss: 0, gateway: 1, lunar: 3, marsTransit: 2, marsSurface: 3 },
    });
    const iss = scoreFinding(f, "iss")!;
    const lunar = scoreFinding(f, "lunar")!;
    expect(lunar - iss).toBeCloseTo(100 * DEFAULT_WEIGHTS.app);
  });

  it("breakdown parts sum to the raw score", () => {
    const b = scoreBreakdown(finding({ id: "b", severity: 3, evidenceStrength: 2 }), "gateway")!;
    const sum = b.parts.sev + b.parts.app + b.parts.evd + b.parts.act;
    expect(sum).toBeCloseTo(b.raw);
  });
});

describe("weights", () => {
  it("normalises by the weight sum (scaling all weights changes nothing)", () => {
    const f = finding({ id: "n", severity: 4, actionability: 2, evidenceStrength: 3 });
    const a = scoreFinding(f, "lunar", { sev: 1, app: 1, evd: 1, act: 1 })!;
    const b = scoreFinding(f, "lunar", { sev: 5, app: 5, evd: 5, act: 5 })!;
    expect(a).toBeCloseTo(b);
  });

  it("falls back to the defaults when all weights are zero or invalid", () => {
    expect(resolveWeights({ sev: 0, app: 0, evd: 0, act: 0 })).toEqual(DEFAULT_WEIGHTS);
    expect(resolveWeights({ sev: -1 })).toEqual(DEFAULT_WEIGHTS);
    expect(resolveWeights({ sev: Number.NaN })).toEqual(DEFAULT_WEIGHTS);
    const f = finding({ id: "z", severity: 2 });
    expect(scoreFinding(f, "iss", { sev: 0, app: 0, evd: 0, act: 0 })).toBeCloseTo(scoreFinding(f, "iss")!);
  });
});

describe("rankFindings", () => {
  const high = finding({ id: "high", severity: 5 });
  const mid = finding({ id: "mid", severity: 3 });
  const low = finding({ id: "low", severity: 1 });
  const draft = finding({ id: "draft", severity: 5, status: "ai-draft" });
  const rejected = finding({ id: "rejected", status: "rejected" });

  it("orders by score descending and excludes rejected findings", () => {
    const ranked = rankFindings([low, draft, rejected, mid, high], "lunar");
    expect(ranked.map((r) => r.finding.id)).toEqual(["high", "mid", "draft", "low"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it("re-ranks when the weights change", () => {
    const actionable = finding({ id: "actionable", severity: 1, actionability: 5 });
    const severe = finding({ id: "severe", severity: 5, actionability: 1 });
    expect(rankFindings([actionable, severe], "iss", { sev: 1, app: 0, evd: 0, act: 0 })[0].finding.id).toBe("severe");
    expect(rankFindings([actionable, severe], "iss", { sev: 0, app: 0, evd: 0, act: 1 })[0].finding.id).toBe(
      "actionable",
    );
  });

  it("re-ranks when the mission changes", () => {
    const orbit = finding({
      id: "orbit",
      missionRelevance: { iss: 3, gateway: 3, lunar: 0, marsTransit: 3, marsSurface: 0 },
    });
    const surface = finding({
      id: "surface",
      missionRelevance: { iss: 0, gateway: 0, lunar: 3, marsTransit: 0, marsSurface: 3 },
    });
    expect(rankFindings([orbit, surface], "iss")[0].finding.id).toBe("orbit");
    expect(rankFindings([orbit, surface], "lunar")[0].finding.id).toBe("surface");
  });

  it("breaks ties deterministically by evidence strength then id", () => {
    const a = finding({ id: "a", evidenceStrength: 5, severity: 1 });
    const b = finding({ id: "b", evidenceStrength: 5, severity: 1 });
    expect(rankFindings([b, a], "iss").map((r) => r.finding.id)).toEqual(["a", "b"]);
  });
});
