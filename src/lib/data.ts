/**
 * EMBER data access (server-side). Every number in the UI is computed from these files in data/processed —
 * never hard-coded. JSON is validated by scripts/ts/validate-data.ts before builds.
 */
import "server-only";
import experimentsJson from "../../data/processed/experiments.json";
import findingsJson from "../../data/processed/findings.json";
import measurementsJson from "../../data/processed/measurements.json";
import glossaryJson from "../../data/processed/glossary.json";
import sourcesJson from "../../data/sources.json";
import type { Experiment, Finding, GlossaryTerm, Measurement, Source } from "@/lib/schema";

export const experiments = experimentsJson as unknown as Experiment[];
export const sources = sourcesJson as unknown as Source[];
export const measurements = measurementsJson as unknown as Measurement[];
export const glossary = glossaryJson as unknown as GlossaryTerm[];
/** Rejected findings are never shown publicly (project.md §9.5). */
export const allFindings = findingsJson as unknown as Finding[];
export const findings = allFindings.filter((f) => f.status !== "rejected");

const experimentById = new Map(experiments.map((e) => [e.id, e]));
const sourceById = new Map(sources.map((s) => [s.id, s]));

export function getExperiment(id: string) {
  return experimentById.get(id);
}
export function getSource(id: string) {
  return sourceById.get(id);
}
export function findingsFor(experimentId: string) {
  return findings.filter((f) => f.experimentId === experimentId);
}
export function measurementsFor(experimentId: string) {
  return measurements.filter((m) => m.experimentId === experimentId);
}
export function sourcesFor(experiment: Experiment) {
  return experiment.sourceIds.map((id) => sourceById.get(id)).filter((s): s is Source => Boolean(s));
}

/** Headline statistics shown on the landing page and Mission Control — all derived from data. */
export function datasetStats() {
  const flight = experiments.filter((e) => e.kind === "flight");
  const years = experiments.map((e) => e.years.start).filter((y) => y > 0);
  const investigationsWithFindings = new Set(findings.map((f) => f.experimentId)).size;
  const referencedSources = new Set(experiments.flatMap((e) => e.sourceIds));
  return {
    investigations: experiments.length,
    flightInvestigations: flight.length,
    groundInvestigations: experiments.length - flight.length,
    findings: findings.length,
    verifiedFindings: findings.filter((f) => f.status === "verified").length,
    draftFindings: findings.filter((f) => f.status === "ai-draft").length,
    investigationsWithFindings,
    sources: sources.length,
    referencedSources: referencedSources.size,
    testPoints: measurements.length,
    firstYear: Math.min(...years),
    lastYear: Math.max(...experiments.map((e) => e.years.end ?? e.years.start)),
    platforms: Array.from(new Set(experiments.map((e) => e.platform))),
  };
}

