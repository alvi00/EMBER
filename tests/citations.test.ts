import { describe, expect, it } from "vitest";
import { flaggedSentences, normalizeAnswer, segmentAnswer, usedAliases, type AliasMap } from "@/lib/ai/citations";

const aliases: AliasMap = {
  S1: { chunkId: "flex:p4:c2", sourceId: "psi-69", page: 4, label: "FLEX · p.4" },
  S2: { chunkId: "bass:p1:c1", sourceId: "ntrs-1", page: 1, label: "BASS · p.1" },
};

describe("normalizeAnswer", () => {
  it("rewrites gpt-oss 【S1】 and 【S1†L3-L5】 markers to [[S1]]", () => {
    expect(normalizeAnswer("Flames spread slower【S1】.")).toBe("Flames spread slower[[S1]].");
    expect(normalizeAnswer("Quenched【S2†L3-L5】.")).toBe("Quenched[[S2]].");
  });

  it("rewrites single-bracket [S1] and lists [S1, S2] but leaves [[S1]] alone", () => {
    expect(normalizeAnswer("A [S1] B [S1, S2]")).toBe("A [[S1]] B [[S1, S2]]");
    expect(normalizeAnswer("Already [[S2]].")).toBe("Already [[S2]].");
  });

  it("replaces non-breaking hyphens", () => {
    expect(normalizeAnswer("low‑velocity")).toBe("low-velocity");
  });
});

describe("segmentAnswer", () => {
  it("turns valid aliases into citation segments", () => {
    const { segments, invalid } = segmentAnswer("Droplets burn longer [[S1]][[S2]].", aliases);
    expect(invalid).toEqual([]);
    expect(segments.filter((s) => s.type === "cite").map((s) => (s.type === "cite" ? s.chunkId : ""))).toEqual(["flex:p4:c2", "bass:p1:c1"]);
  });

  it("strips citations that were not retrieved and reports them", () => {
    const { segments, invalid } = segmentAnswer("Invented claim [[S9]].", aliases);
    expect(invalid).toEqual(["S9"]);
    expect(segments.some((s) => s.type === "cite")).toBe(false);
  });

  it("hides an incomplete trailing marker while streaming", () => {
    const text = segmentAnswer("Partial answer [[S", aliases).segments.map((s) => (s.type === "text" ? s.text : "")).join("");
    expect(text).toBe("Partial answer ");
  });
});

describe("flaggedSentences / usedAliases", () => {
  it("flags only the sentence with a fabricated citation", () => {
    const text = "Real finding [[S1]]. Made-up finding [[S7]]. Another real one [[S2]].";
    expect(flaggedSentences(text, aliases)).toEqual(["Made-up finding ."]);
    expect(usedAliases(text, aliases).sort()).toEqual(["S1", "S2"]);
  });
});
