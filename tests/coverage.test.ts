import { describe, expect, it } from "vitest";
import { assessCoverage, buildNormaliser, distance, normalise, THRESHOLDS } from "@/lib/coverage";
import type { Measurement } from "@/lib/schema";

let n = 0;
function point(p: Partial<Measurement>): Measurement {
  n += 1;
  return {
    id: `m${n}`,
    experimentId: "exp",
    testId: `T${n}`,
    fuel: "fabric",
    fuelFamily: "Thin fabric (cotton/fiberglass)",
    geometry: "thin-sheet",
    gravityG: 0,
    outcome: "burned",
    sourceId: "src",
    ...p,
  };
}

// A hand-built dataset spanning O2 16-34 %, flow 1-40 cm/s, pressure 50-100 kPa, gravity 0 and 1 g.
const data = [
  point({ o2Percent: 16, flowCmS: 1, pressureKpa: 100, gravityG: 0 }),
  point({ o2Percent: 21, flowCmS: 10, pressureKpa: 100, gravityG: 0 }),
  point({ o2Percent: 34, flowCmS: 40, pressureKpa: 50, gravityG: 0 }),
  point({ o2Percent: 21, flowCmS: 20, pressureKpa: 100, gravityG: 1 }),
];

describe("normalisation", () => {
  const norm = buildNormaliser(data);
  it("maps dataset extremes to 0 and 1", () => {
    expect(normalise(norm, "o2Percent", 16)).toBeCloseTo(0);
    expect(normalise(norm, "o2Percent", 34)).toBeCloseTo(1);
    expect(normalise(norm, "pressureKpa", 50)).toBeCloseTo(0);
    expect(normalise(norm, "pressureKpa", 100)).toBeCloseTo(1);
  });
  it("uses a log scale for flow and pressure", () => {
    // Geometric midpoint of 50 and 100 kPa sits at 0.5 on a log scale.
    expect(normalise(norm, "pressureKpa", Math.sqrt(50 * 100))).toBeCloseTo(0.5);
    const mid = Math.expm1((Math.log1p(1) + Math.log1p(40)) / 2);
    expect(normalise(norm, "flowCmS", mid)).toBeCloseTo(0.5);
  });
  it("gravity always spans 0-1 g", () => {
    expect(normalise(norm, "gravityG", 0.166)).toBeCloseTo(0.166);
  });
});

describe("assessCoverage", () => {
  it("returns 'direct' for a query on a tested point", () => {
    const r = assessCoverage({ gravityG: 0, o2Percent: 21, flowCmS: 10, pressureKpa: 100 }, data);
    expect(r.verdict).toBe("direct");
    expect(r.best?.distance).toBeLessThan(THRESHOLDS.direct);
    expect(r.nearest[0].point.id).toBe(data[1].id);
  });

  it("returns 'near' just outside tested conditions", () => {
    // 2 points of O2 away from a tested point = 2/18 ≈ 0.11 normalised → sqrt(0.11² / 4) ≈ 0.056 → near
    const r = assessCoverage({ gravityG: 0, o2Percent: 23, flowCmS: 10, pressureKpa: 100 }, data);
    expect(r.verdict).toBe("near");
  });

  it("returns 'extrapolation' far from every test point", () => {
    const r = assessCoverage({ gravityG: 0, o2Percent: 34, flowCmS: 1, pressureKpa: 100 }, data);
    expect(r.verdict).toBe("extrapolation");
  });

  it("forces a gravity mismatch to at most 'near' and warns about partial gravity", () => {
    // Identical to a tested point except gravity 0.02+ away: distance is tiny but it cannot be 'direct'.
    const r = assessCoverage({ gravityG: 0.03, o2Percent: 21, flowCmS: 10, pressureKpa: 100 }, data);
    expect(r.best!.distance).toBeLessThan(THRESHOLDS.direct);
    expect(r.verdict).toBe("near");
    expect(r.warnings.join(" ")).toMatch(/No test at 0.03 g/);
  });

  it("lunar gravity with no lunar data warns and is never 'direct'", () => {
    const r = assessCoverage({ gravityG: 0.166, o2Percent: 34, flowCmS: 40, pressureKpa: 50 }, data);
    expect(r.verdict).not.toBe("direct");
    expect(r.warnings.some((w) => w.includes("partial gravity"))).toBe(true);
  });

  it("skips and reports dimensions a point does not state", () => {
    const sparse = [point({ o2Percent: 21, gravityG: 0 })];
    const d = distance({ gravityG: 0, o2Percent: 21, flowCmS: 10 }, sparse[0], buildNormaliser(data));
    expect(d.usedDims).toEqual(["gravityG", "o2Percent"]);
    expect(d.skippedDims).toEqual(["flowCmS"]);
    const r = assessCoverage({ gravityG: 0, o2Percent: 21, flowCmS: 10 }, sparse);
    expect(r.unmatchedDims).toEqual(["flowCmS"]);
    expect(r.warnings.join(" ")).toMatch(/flow speed/);
  });

  it("handles an empty scope as extrapolation", () => {
    const r = assessCoverage({ gravityG: 0.38, o2Percent: 21 }, []);
    expect(r.verdict).toBe("extrapolation");
    expect(r.nearest).toHaveLength(0);
  });

  it("returns the k nearest points in ascending distance", () => {
    const r = assessCoverage({ gravityG: 0, o2Percent: 21, flowCmS: 12, pressureKpa: 100 }, data, { k: 3 });
    expect(r.nearest).toHaveLength(3);
    const ds = r.nearest.map((x) => x.distance);
    expect([...ds].sort((a, b) => a - b)).toEqual(ds);
  });
});
