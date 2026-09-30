import { describe, expect, it } from "vitest";
import { COMPARE_DIMS, compareDomains, outcomeCounts, parseCompareIds, position } from "@/lib/compare";
import type { Experiment, Measurement } from "@/lib/schema";

const known = new Set(["flex", "bass-ii", "saffire-ii", "cfi"]);

describe("parseCompareIds", () => {
  it("keeps known ids in order, drops unknown and duplicates, caps at three", () => {
    expect(parseCompareIds("flex,nope,flex,bass-ii,saffire-ii,cfi", known)).toEqual(["flex", "bass-ii", "saffire-ii"]);
  });
  it("accepts repeated params and odd spacing/case", () => {
    expect(parseCompareIds([" FLEX", "cfi "], known)).toEqual(["flex", "cfi"]);
  });
  it("returns an empty list for missing input", () => {
    expect(parseCompareIds(undefined, known)).toEqual([]);
  });
});

const exp = (id: string, conditions: Experiment["conditions"]) => ({ id, conditions }) as Experiment;

describe("compareDomains / position", () => {
  const all = [exp("a", { o2Percent: { min: 15, max: 21 }, pressureKpa: { min: 10, max: 100 } }), exp("b", { o2Percent: { min: 21, max: 40 } })];
  const domains = compareDomains(all);

  it("spans the stated ranges of all experiments; gravity is always 0–1 g; missing dims are null", () => {
    expect(domains.o2Percent).toEqual({ min: 15, max: 40 });
    expect(domains.gravityG).toEqual({ min: 0, max: 1 });
    expect(domains.flowCmS).toBeNull();
  });

  it("maps values linearly or on a log scale and clamps to the track", () => {
    const o2 = COMPARE_DIMS.find((d) => d.key === "o2Percent")!;
    const p = COMPARE_DIMS.find((d) => d.key === "pressureKpa")!;
    expect(position(o2, domains.o2Percent!, 27.5)).toBeCloseTo(0.5);
    expect(position(p, domains.pressureKpa!, Math.sqrt(1000))).toBeCloseTo(0.5); // geometric midpoint of 10–100
    expect(position(o2, domains.o2Percent!, 99)).toBe(1);
  });
});

describe("outcomeCounts", () => {
  it("counts each outcome", () => {
    const m = (outcome: Measurement["outcome"]) => ({ outcome }) as Measurement;
    expect(outcomeCounts([m("burned"), m("burned"), m("self-extinguished"), m("no-ignition")])).toEqual({
      total: 4,
      burned: 2,
      selfExtinguished: 1,
      noIgnition: 1,
      extinguishedByAgent: 0,
    });
  });
});
