import "server-only";
import { experiments, findings, measurements } from "@/lib/data";
import { buildCoverageGrid } from "@/lib/coverage-grid";
import type { Experiment } from "@/lib/schema";
import { tidy } from "@/lib/text";

export type GravityRegime = "micro" | "partial" | "ground";

export type TimelineRow = {
  id: string;
  acronym: string;
  fullName: string;
  platform: Experiment["platform"];
  regime: GravityRegime;
  start: number;
  end: number;
  open: boolean;
  findingIds: string[];
};

export const PLATFORM_ORDER: Experiment["platform"][] = [
  "ISS",
  "Cygnus",
  "Sounding rocket",
  "Drop tower",
  "Parabolic aircraft",
  "Space Shuttle",
  "Ground",
];

function regimeOf(e: Experiment): GravityRegime {
  if (e.platform === "Ground") return "ground";
  const g = e.conditions.gravityG;
  if (g && g.max > 0.05) return "partial";
  return "micro";
}

/** Experiment timeline rows grouped by platform (then by start year). Open-ended experiments are flagged. */
export function timelineRows(): TimelineRow[] {
  return experiments
    .filter((e) => e.years.start > 0)
    .map((e) => ({
      id: e.id,
      acronym: tidy(e.acronym),
      fullName: tidy(e.fullName),
      platform: e.platform,
      regime: regimeOf(e),
      start: e.years.start,
      end: e.years.end ?? e.years.start,
      open: e.years.end === undefined,
      findingIds: findings.filter((f) => f.experimentId === e.id).map((f) => f.id),
    }))
    .sort(
      (a, b) =>
        PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform) ||
        a.start - b.start ||
        a.acronym.localeCompare(b.acronym),
    );
}

export function coverageCells() {
  return buildCoverageGrid(measurements);
}

export function unplacedMeasurements() {
  return measurements.filter((m) => m.o2Percent === undefined).length;
}
