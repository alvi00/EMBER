import "server-only";
import { experiments, findings, glossary, sources } from "@/lib/data";
import type { Source } from "@/lib/schema";
import { tidy } from "@/lib/text";

/** Compact, client-safe catalogue passed from the root layout to client components (palette, drawers, chips). */
export type CatalogSource = {
  id: string;
  title: string;
  type: Source["type"];
  url: string;
  year?: number;
  authors?: string[];
  accession?: string;
  publisher?: string;
  license?: string;
  doi?: string;
  experimentIds: string[];
  label: string;
};
export type CatalogExperiment = { id: string; acronym: string; fullName: string; platform: string; start: number };
export type CatalogFinding = { id: string; experimentId: string; statement: string; category: string; status: string };
export type CatalogTerm = { id: string; term: string; short: string };
export type Catalog = {
  sources: CatalogSource[];
  experiments: CatalogExperiment[];
  findings: CatalogFinding[];
  glossary: CatalogTerm[];
};

const acronymOf = new Map(experiments.map((e) => [e.id, e.acronym]));

/** Short label for citation chips, e.g. "FLEX" or "NTRS 20150023456". */
export function shortSourceLabel(s: Source): string {
  if (s.type === "nasa-web") return "NASA Science";
  const exps = s.experimentIds.map((id) => acronymOf.get(id)).filter(Boolean) as string[];
  if (s.accession?.startsWith("PSI") && exps.length) return exps[0];
  if (exps.length === 1) return exps[0];
  if (exps.length === 2) return `${exps[0]} / ${exps[1]}`;
  return s.accession ? `NTRS ${s.accession}` : tidy(s.title).slice(0, 24);
}

export function buildCatalog(): Catalog {
  return {
    sources: sources.map((s) => ({
      id: s.id,
      title: tidy(s.title),
      type: s.type,
      url: s.url,
      year: s.year,
      authors: s.authors?.slice(0, 6),
      accession: s.accession,
      publisher: s.publisher,
      license: s.license,
      doi: s.doi,
      experimentIds: s.experimentIds,
      label: shortSourceLabel(s),
    })),
    experiments: experiments.map((e) => ({
      id: e.id,
      acronym: tidy(e.acronym),
      fullName: tidy(e.fullName),
      platform: e.platform,
      start: e.years.start,
    })),
    findings: findings.map((f) => ({
      id: f.id,
      experimentId: f.experimentId,
      statement: f.statement,
      category: f.category,
      status: f.status,
    })),
    glossary: glossary.map((g) => ({ id: g.id, term: g.term, short: g.short })),
  };
}
