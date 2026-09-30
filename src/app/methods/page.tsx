import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { loadPrecomputed } from "@/lib/ai/precomputed";
import { PRECOMPUTED_MATCH, RELEVANCE_GATE } from "@/lib/ai/constants";
import { THRESHOLDS } from "@/lib/coverage";
import { datasetStats, experiments, findings, glossary, measurements, sources } from "@/lib/data";
import { passageCount } from "@/lib/evidence";
import { MISSIONS } from "@/lib/missions";
import type { Source } from "@/lib/schema";
import { DEFAULT_WEIGHTS, DRAFT_PENALTY, WEIGHT_LABELS } from "@/lib/scoring";
import { tidy } from "@/lib/text";

export const metadata: Metadata = {
  title: "Methods",
  description:
    "How EMBER collects NASA microgravity combustion records, extracts traceable findings, ranks them, measures evidence coverage and answers questions with citations. Limitations included.",
};

const SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "sources", label: "Data sources" },
  { id: "pipeline", label: "Pipeline" },
  { id: "findings", label: "Findings protocol" },
  { id: "measurements", label: "Test points" },
  { id: "scoring", label: "Insight score" },
  { id: "coverage", label: "Coverage metric" },
  { id: "copilot", label: "Ask the Flame" },
  { id: "limitations", label: "Limitations" },
  { id: "reproduce", label: "Reproduce" },
  { id: "ai-use", label: "Use of AI" },
  { id: "glossary", label: "Glossary" },
  { id: "references", label: "References" },
];

const TYPE_LABEL: Record<Source["type"], string> = {
  "psi-dataset": "PSI investigation records and data files",
  "ntrs-report": "NTRS technical reports and papers",
  presentation: "NTRS presentations",
  journal: "Journal articles (linked, not re-hosted)",
  "nasa-web": "NASA web pages",
};

const MEASUREMENT_SOURCES: { experimentId: string; table: string }[] = [
  { experimentId: "flex", table: "PSI-69 experimental table" },
  { experimentId: "acme-cfi-g", table: "PSI-159 experimental table, normal flames" },
  { experimentId: "partial-g-centrifuge", table: "NTRS 20130010991, Table I (ULOI and MOC)" },
  { experimentId: "bass-ii", table: "NTRS 20150008962, appendix table" },
  { experimentId: "saffire-ii", table: "PSI-99 experimental table (0 g and 1 g columns)" },
  { experimentId: "saffire-iv-vi", table: "NTRS 20260001992, Table 1" },
  { experimentId: "saffire-i", table: "PSI-98 experimental table + NTRS 20170008805" },
];

const CONVERSIONS = [
  { from: "mmHg", factor: "× 0.133322", used: "FLEX chamber pressure" },
  { from: "psia", factor: "× 6.894757", used: "Partial-gravity limits (Table I)" },
  { from: "bar", factor: "× 100", used: "ACME CFI-G chamber pressure" },
  { from: "mbar", factor: "× 0.1", used: "Saffire IV to VI vehicle pressure" },
  { from: "atm", factor: "× 101.325", used: "Experiment condition ranges stated in atmospheres" },
  { from: "O2 mole fraction", factor: "× 100 → % O2", used: "FLEX, CFI-G, Saffire IV to VI" },
];

const OUTCOMES = [
  {
    source: "FLEX",
    raw: "Extinction",
    mapped: "Self-extinguished",
    why: "flame went out before the droplet was consumed",
  },
  {
    source: "FLEX",
    raw: "Completion / Disruption",
    mapped: "Burned",
    why: "droplet burned to completion or until it disrupted",
  },
  {
    source: "BASS-II",
    raw: "Quenched / Blow-off",
    mapped: "Self-extinguished",
    why: "at the final (reduced or increased) flow speed",
  },
  {
    source: "BASS-II",
    raw: "No ignition",
    mapped: "No ignition",
    why: "reused samples excluded, as in the source paper",
  },
  { source: "BASS-II", raw: "blank / No Blow-off", mapped: "Burned", why: "flame sustained at the final flow speed" },
  {
    source: "Saffire-II",
    raw: "0 g burn length “~ 0”",
    mapped: "Self-extinguished",
    why: "igniter flame did not spread",
  },
  { source: "Saffire-II", raw: "measured burn length", mapped: "Burned", why: "flame spread over the sample" },
  { source: "Partial-g Table I", raw: "ULOI", mapped: "Burned", why: "lowest O2 at which the flame propagated" },
  { source: "Partial-g Table I", raw: "MOC", mapped: "Self-extinguished", why: "highest O2 at which it did not" },
  {
    source: "ACME CFI-G",
    raw: "SE / FT",
    mapped: "Self-extinguished / Burned",
    why: "FT: flame persisted until fuel flow was terminated",
  },
];

function authorLine(authors: string[] | undefined): string | null {
  if (!authors?.length) return null;
  return authors.length > 3 ? `${authors.slice(0, 3).join(", ")} et al.` : authors.join(", ");
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-display text-ink scroll-mt-28 pt-4 text-3xl leading-tight md:text-4xl">
      <a href={`#${id}`} className="hover:text-flame-core">
        {children}
      </a>
    </h2>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    // tabIndex: wide formulas scroll horizontally, so keyboard users must be able to focus and scroll them.
    <pre
      tabIndex={0}
      className="border-line bg-elev-1 text-ink focus-visible:outline-flame-micro overflow-x-auto rounded-xl border px-4 py-3 font-mono text-[13px] leading-relaxed focus-visible:outline-2"
    >
      {children}
    </pre>
  );
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={`Table: ${head.join(", ")}`}
      className="border-line focus-visible:outline-flame-micro overflow-x-auto rounded-xl border focus-visible:outline-2"
    >
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-elev-1 text-ink-muted text-xs">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="text-ink-muted first:text-ink px-3 py-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MethodsPage() {
  const s = datasetStats();
  const passages = passageCount();
  const precomputed = loadPrecomputed();
  const pre = {
    suggested: precomputed.filter((a) => a.kind === "suggested").length,
    digest: precomputed.filter((a) => a.kind === "digest").length,
    refused: precomputed.filter((a) => a.kind === "out-of-scope").length,
  };
  const byType = (Object.keys(TYPE_LABEL) as Source["type"][]).map((t) => ({
    type: t,
    list: sources.filter((x) => x.type === t),
  }));
  const countFor = (id: string) => measurements.filter((m) => m.experimentId === id).length;
  const acronym = (id: string) => experiments.find((e) => e.id === id)?.acronym ?? id;
  const outcomes = {
    burned: measurements.filter((m) => m.outcome === "burned").length,
    se: measurements.filter((m) => m.outcome === "self-extinguished").length,
    ni: measurements.filter((m) => m.outcome === "no-ignition").length,
  };
  const categories = new Set(findings.map((f) => f.category)).size;
  // ML-estimate feasibility (project.md §11, Phase 3 step 7): at least 150 labelled points in one material family,
  // validated by cross-validation grouped by experiment.
  const ML_MIN_ROWS = 150;
  const families = Object.values(
    measurements.reduce<Record<string, { name: string; n: number; exps: Set<string>; g: Set<number> }>>((acc, m) => {
      const f = (acc[m.fuelFamily] ??= { name: m.fuelFamily, n: 0, exps: new Set(), g: new Set() });
      f.n++;
      f.exps.add(m.experimentId);
      f.g.add(m.gravityG);
      return acc;
    }, {}),
  ).sort((a, b) => b.n - a.n);
  const mlEligible = families.filter((f) => f.n >= ML_MIN_ROWS);
  const mlNext = families.find((f) => f.n < ML_MIN_ROWS);
  const sortedGlossary = [...glossary].sort((a, b) => a.term.localeCompare(b.term));
  const termId = new Set(glossary.map((g) => g.id));

  return (
    <>
      <PageHeader
        eyebrow="Methods"
        title="How EMBER turns an archive into evidence"
        description="Sources, pipeline, extraction and verification, scoring, the coverage metric, the copilot and its limits. Every number on this page is computed from the processed dataset when the page renders."
      />
      <div className="container-ember grid gap-12 pb-24 lg:grid-cols-12">
        <nav aria-label="On this page" className="hidden lg:col-span-3 lg:block">
          <ol className="border-line sticky top-28 space-y-1 border-l text-sm">
            {SECTIONS.map((sec) => (
              <li key={sec.id}>
                <a
                  href={`#${sec.id}`}
                  className="text-ink-muted hover:border-flame-core hover:text-ink -ml-px block border-l border-transparent py-1 pl-4 transition-colors"
                >
                  {sec.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="text-ink-muted min-w-0 space-y-6 text-[15px] leading-relaxed lg:col-span-9 [&_p]:max-w-[72ch]">
          <H2 id="summary">Summary</H2>
          <p>
            Fire in orbit behaves differently from fire on Earth: without buoyancy a flame loses the upward flow that
            feeds it fresh oxygen, so flammability, flame spread and smoke all change, and partial-gravity tests found
            materials that burn at lower oxygen levels in lunar gravity than in 1 g. NASA has studied this for decades,
            but the results sit across technical reports, data archives and slide decks written for specialists. The key
            challenges are <em>traceability</em>, so that every claim leads back to a NASA passage, and{" "}
            <em>applicability</em>, since a result measured at 0 g and 21% O2 may not transfer to a lunar cabin at 0.17
            g and 34% O2.
          </p>
          <p>
            To address these challenges, we present EMBER (Exploration Microgravity Burn Evidence Resource), an
            evidence-first research tool built on {s.sources} NASA sources covering {s.investigations} investigations
            from {s.firstYear} to {s.lastYear} ({s.flightInvestigations} flight, {s.groundInvestigations} ground). From{" "}
            {passages.toLocaleString("en-US")} source passages it derives {s.findings} structured findings in{" "}
            {categories} categories across {s.investigationsWithFindings} investigations and {s.testPoints} test points
            with stated conditions and outcomes. It ranks findings for one mission at a time with a visible formula,
            measures how close a proposed cabin is to tested conditions, and answers questions only from retrieved,
            cited passages.{" "}
            {s.verifiedFindings
              ? `${s.verifiedFindings} of the ${s.findings} findings are human-verified so far; the rest are labelled AI drafts everywhere they appear.`
              : `None of the ${s.findings} findings has been human-verified yet, so all are labelled AI drafts everywhere they appear.`}
          </p>

          <H2 id="sources">Data sources</H2>
          <p>
            Two NASA archives supply every record. NASA Physical Sciences Informatics (PSI) provides investigation
            records (objectives, approach, impacts), documents and experimental tables, released under CC0. The NASA
            Technical Reports Server (NTRS) provides reports, conference papers and presentations. Sources were chosen
            for direct relevance to spacecraft fire safety: flame spread over solids, flammability limits, droplet and
            gas-jet flames, cool flames, smoke and suppression. Paywalled journal articles are cited by link only and
            never re-hosted.
          </p>
          <Table
            head={["Source type", "Count"]}
            rows={byType
              .filter((t) => t.list.length)
              .map((t) => [
                TYPE_LABEL[t.type],
                <span key={t.type} className="tabular font-mono">
                  {t.list.length}
                </span>,
              ])}
          />

          <H2 id="pipeline">Pipeline</H2>
          <p>
            Given a question about fire safety on a mission, the conventional approach is a keyword search of NTRS
            followed by reading whole reports. In contrast, EMBER precomputes a structured, traceable evidence layer.
            The data pipeline executes four stages: (i) <span className="text-ink">collect</span>, PSI records and files
            through the public PSI repository interface and NTRS citations and PDFs through the NTRS API, each logged
            with its URL, licence and access date; (ii) <span className="text-ink">extract</span>, page-aware text from
            PDFs with PyMuPDF, split into chunks of about 350 tokens with a 60-token overlap that never cross a page
            boundary, so every chunk keeps an exact page number; (iii) <span className="text-ink">structure</span>,
            experimental tables normalised into test points and candidate findings validated against the chunks; and
            (iv) <span className="text-ink">index</span>, a BM25 keyword index (MiniSearch) and 384-dimension sentence
            embeddings (all-MiniLM-L6-v2 through transformers.js, stored as int8) for every chunk. All processed files
            are validated against zod schemas before the site builds.
          </p>
          <Formula>{`data/raw ─► scripts/py (collect, extract, tables) ─► data/interim ─► scripts/ts (findings, embeddings, index) ─► data/processed ─► site`}</Formula>

          <H2 id="findings">Findings protocol</H2>
          <p>
            Free-text summaries are susceptible to drift: a paraphrase can quietly overstate what an experiment showed.
            To address this, every finding stores at least one verbatim excerpt of at most 25 words, and the build step
            rejects any excerpt that is not a whitespace-normalised substring of a chunk of the cited source. The chunk
            id and page are resolved by the script, never typed by hand, so a citation chip always opens the passage the
            excerpt came from.
          </p>
          <p>
            Candidate findings were drafted by Claude Code from the extracted chunks under those rules, and every
            candidate enters the dataset as an <span className="text-ink">AI draft</span>. Each carries a statement, a
            plain-language version, a safety implication, a category, severity, actionability and evidence strength on 1
            to 5 scales, a 0 to 3 relevance score for each of the {MISSIONS.length} missions with a short rationale, and
            a confidence level. A human reviewer verifies, edits or rejects each one in a local review screen; the
            drafting model can never mark a finding verified. Current state:{" "}
            <span className="text-ink">{s.verifiedFindings} verified</span>,{" "}
            <span className="text-ink">{s.draftFindings} AI drafts</span>. Drafts appear throughout the site with a
            badge and are down-weighted in the ranking.
          </p>

          <H2 id="measurements">Test points</H2>
          <p>
            A test point is one burn with its stated conditions (gravity, oxygen, pressure, flow speed, fuel and
            geometry) and outcome. Test points come only from tables in the sources below; a condition the table does
            not state is left empty and reported as missing rather than filled in. Of the {s.testPoints} points,{" "}
            {outcomes.burned} burned, {outcomes.se} self-extinguished and {outcomes.ni} did not ignite; the original
            outcome text is kept alongside the mapped value.
          </p>
          <Table
            head={["Investigation", "Table", "Test points"]}
            rows={MEASUREMENT_SOURCES.map((m) => [
              acronym(m.experimentId),
              m.table,
              <span key={m.experimentId} className="tabular font-mono">
                {countFor(m.experimentId)}
              </span>,
            ])}
          />
          <h3 className="text-ink pt-2 text-sm font-medium">Unit conversions</h3>
          <p>
            Pressures are stored in kPa, oxygen as percent by volume, flow in cm/s and gravity in multiples of Earth
            gravity (0, 0.166 lunar, 0.38 Martian, 1).
          </p>
          <Table
            head={["From", "Conversion", "Where it applies"]}
            rows={CONVERSIONS.map((c) => [
              c.from,
              <span key={c.from} className="font-mono">
                {c.factor}
              </span>,
              c.used,
            ])}
          />
          <h3 className="text-ink pt-2 text-sm font-medium">Outcome mapping</h3>
          <Table
            head={["Source", "Reported outcome", "Mapped to", "Reading"]}
            rows={OUTCOMES.map((o) => [o.source, o.raw, o.mapped, o.why])}
          />

          <H2 id="scoring">Insight score</H2>
          <p>
            A single ranking for all missions is misleading: a finding about lunar-gravity flammability matters more for
            a lunar habitat than for the ISS. To address this, findings are ranked per mission with a transparent
            weighted score, and the weights can be changed on the Insights page, where each score also shows its
            breakdown.
          </p>
          <Formula>{`score = 100 × ( w_sev·norm(severity) + w_app·relevance[mission]/3
              + w_evd·norm(evidence strength) + w_act·norm(actionability) ) / Σw
norm(x) = (x − 1) / 4   for the 1–5 scales
AI-draft findings × ${DRAFT_PENALTY}`}</Formula>
          <Table
            head={["Factor", "Default weight"]}
            rows={(Object.keys(DEFAULT_WEIGHTS) as (keyof typeof DEFAULT_WEIGHTS)[]).map((k) => [
              WEIGHT_LABELS[k],
              <span key={k} className="tabular font-mono">
                {DEFAULT_WEIGHTS[k].toFixed(2)}
              </span>,
            ])}
          />
          <p>
            Ties break on evidence strength, then severity, then id, so the order is stable. Weights that are all zero
            or invalid fall back to the defaults. Rejected findings are never scored or shown. The scoring function is
            covered by unit tests.
          </p>

          <H2 id="coverage">Coverage metric</H2>
          <p>
            A cabin condition is only as well supported as the nearest test. The Risk Lens therefore reports how far a
            proposed condition sits from tested conditions for the same material family, rather than a flammability
            prediction. Each dimension is normalised to 0 to 1 over the dataset range, on a log scale for pressure and a
            log(1 + x) scale for flow so that 0 cm/s is valid; gravity always spans 0 to 1 g. Distance is a weighted
            Euclidean over the dimensions both the query and the test point state, and dimensions a test point does not
            state are skipped and reported.
          </p>
          <Formula>{`d(q, p) = √( Σ_i w_i (q̂_i − p̂_i)² / Σ_i w_i )   over dimensions stated by both
direct         d < ${THRESHOLDS.direct}
near           d < ${THRESHOLDS.near}
extrapolation  otherwise`}</Formula>
          <p>
            A gravity mismatch can never be rated &ldquo;directly tested&rdquo;: it is capped at &ldquo;near&rdquo;, and
            when no test in the material family was run at the query gravity the verdict carries a partial-gravity
            warning, because some materials burn at lower oxygen in partial gravity than at 0 g or 1 g. The metric is
            covered by unit tests.
          </p>

          <H2 id="copilot">Ask the Flame</H2>
          <p>
            A general chat model answering fire-safety questions is susceptible to fluent invention. To address this,
            the copilot answers only from retrieved passages. Retrieval fuses the top 20 BM25 matches and the top 20
            embedding matches with reciprocal rank fusion (k = 60) and keeps the best 8. A relevance gate then declines
            the question when the closest passage has a cosine similarity below {RELEVANCE_GATE}: on a calibration set
            of 8 in-scope and 7 out-of-scope questions, the closest-passage cosine ranged from 0.524 to 0.763 for
            in-scope and 0.165 to 0.451 for out-of-scope questions.
          </p>
          <p>
            The model must cite a passage alias after every factual sentence and use three sections: what the evidence
            shows, what it means for the selected mission, and what the data does not cover. The server maps aliases
            back to chunk ids; a citation to anything not retrieved is removed and its sentence flagged. With no model
            configured, or when the provider fails, EMBER answers offline: from a saved answer when the question matches
            one with cosine at least {PRECOMPUTED_MATCH}, otherwise by showing the most relevant passages verbatim. The
            saved set holds {pre.suggested} suggested answers, {pre.digest} mission digests and {pre.refused} verified
            refusals. API keys stay on the server.
          </p>

          <H2 id="limitations">Limitations</H2>
          <ul className="marker:text-ink-faint list-disc space-y-2 pl-5">
            <li>
              {s.draftFindings} of {s.findings} findings are AI drafts pending human review. Their severity,
              actionability, evidence strength and mission relevance scores are judgments, so rankings can change as
              findings are reviewed.
            </li>
            <li>
              The corpus is a curated selection of {s.sources} sources, not all of NTRS or PSI. Absence of a finding
              means absence from this corpus, not absence of evidence.
            </li>
            <li>
              Test points come from seven tables. Many investigations report results only in prose or figures, so they
              contribute findings but no test points, and coverage verdicts are limited to the material families those
              tables contain.
            </li>
            <li>
              Cabin atmospheres are sourced for the ISS and the lunar surface only; Gateway, Mars transit and Mars
              surface defaults are marked as assumptions in the interface.
            </li>
            <li>
              The coverage metric is a distance in condition space with equal dimension weights. It says how close a
              condition is to a test, not whether a material will burn.
            </li>
            <li>
              The relevance gate was calibrated on 15 questions; borderline questions can be declined or answered with
              low confidence. The embedding model is small and English-only.
            </li>
            <li>
              A machine-learning flammability estimate for the Risk Lens was a stretch goal with a bar set in advance:
              at least {ML_MIN_ROWS} labelled test points in one material family, validated by cross-validation grouped
              by experiment. It was checked against the data and not shipped.{" "}
              {mlEligible.length ? (
                <>
                  Only{" "}
                  {mlEligible
                    .map(
                      (f) =>
                        `${f.name} (${f.n} points, all from ${[...f.exps].map(acronym).join(", ")} at ${[...f.g].join(", ")} g)`,
                    )
                    .join("; ")}{" "}
                  clears the size bar, so there is no second experiment to validate against, and a model of one
                  experiment&apos;s fuels would not transfer to cabin materials.
                </>
              ) : (
                <>No material family reaches that size.</>
              )}{" "}
              {mlNext
                ? `The next largest family, ${mlNext.name}, has ${mlNext.n} points from ${mlNext.exps.size} experiment${mlNext.exps.size === 1 ? "" : "s"}.`
                : null}
            </li>
            <li>
              EMBER is a research exploration tool built for the NASA Space Apps Challenge. It is not an official NASA
              product and not guidance for operational safety decisions.
            </li>
          </ul>

          <H2 id="reproduce">Reproduce</H2>
          <p>From the repository root in PowerShell (Node 22 and Python 3.11):</p>
          <Formula>{`npm install
python -m pip install pymupdf
python scripts/py/build_registry.py        # sources.json + experiments.json from data/raw
python scripts/py/extract_pdf.py           # page-aware chunks
python scripts/py/clean_tables.py          # normalised experimental tables
python scripts/py/build_measurements.py    # test points
npx tsx scripts/ts/extract-findings.ts     # findings, excerpt checks
npx tsx scripts/ts/build-embeddings.ts     # embeddings (model cached in ./models-cache)
npx tsx scripts/ts/build-index.ts          # BM25 index
npx tsx --conditions=react-server scripts/ts/precompute-answers.ts   # needs a key in .env.local
npm run data:validate
npm test
npm run build; npm start`}</Formula>

          <H2 id="ai-use">Use of AI</H2>
          <p>
            Claude Code (Anthropic) wrote the application code and data scripts, drafted the candidate findings and
            their scores from the extracted source text, and wrote the glossary definitions; all drafted findings are
            labelled as AI drafts until a human verifies them. Ask the Flame and the Mission Control digest use the
            configured language model
            {precomputed[0]
              ? ` (saved answers were generated with ${precomputed.find((a) => a.kind === "suggested")?.generatedBy.replace(/^[^:]*:/, "") ?? "the configured model"})`
              : ""}
            , constrained to cited passages. Sentence embeddings use all-MiniLM-L6-v2, run locally. The experiment
            records, test values and quoted excerpts come from NASA sources and are not generated.
          </p>

          <H2 id="glossary">Glossary</H2>
          <dl className="divide-line border-line divide-y rounded-xl border">
            {sortedGlossary.map((g) => (
              <div key={g.id} id={`term-${g.id}`} className="target:bg-flame-core/[0.06] scroll-mt-28 px-4 py-3">
                <dt className="text-ink text-sm font-medium">{g.term}</dt>
                <dd className="mt-1 text-sm">
                  {g.definition}
                  {g.related.filter((r) => termId.has(r)).length ? (
                    <span className="text-ink-faint mt-1 block text-xs">
                      Related:{" "}
                      {g.related
                        .filter((r) => termId.has(r))
                        .map((r, i, arr) => (
                          <span key={r}>
                            <a
                              href={`#term-${r}`}
                              className="text-flame-micro decoration-flame-micro/40 hover:decoration-flame-micro underline underline-offset-4"
                            >
                              {glossary.find((x) => x.id === r)?.term}
                            </a>
                            {i < arr.length - 1 ? ", " : ""}
                          </span>
                        ))}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>

          <H2 id="references">References</H2>
          <p>
            Data from NASA Physical Sciences Informatics (psi.nasa.gov) and the NASA Technical Reports Server
            (ntrs.nasa.gov). We acknowledge the NASA Physical Sciences Research Program and the principal investigators
            whose data are archived in PSI. Every source below was accessed on the date recorded in the dataset.
          </p>
          <div className="space-y-3">
            {byType
              .filter((t) => t.list.length)
              .map((t) => (
                <details key={t.type} className="group border-line rounded-xl border">
                  <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm">
                    <span>
                      {TYPE_LABEL[t.type]} <span className="text-ink-faint tabular font-mono">({t.list.length})</span>
                    </span>
                    <span aria-hidden className="text-ink-faint transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <ol className="divide-line border-line divide-y border-t">
                    {[...t.list]
                      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title))
                      .map((src) => (
                        <li key={src.id} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                          <div className="min-w-0">
                            <p className="text-ink">{tidy(src.title)}</p>
                            <p className="text-ink-faint mt-0.5 font-mono text-xs">
                              {[
                                authorLine(src.authors),
                                src.year,
                                src.accession ?? src.id,
                                src.doi ? `doi:${src.doi}` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {src.experimentIds.length ? (
                              <p className="mt-1 text-xs">
                                {src.experimentIds.slice(0, 4).map((id, i) => (
                                  <span key={id}>
                                    <Link
                                      href={`/experiments/${id}`}
                                      className="text-flame-micro decoration-flame-micro/40 hover:decoration-flame-micro underline underline-offset-4"
                                    >
                                      {acronym(id)}
                                    </Link>
                                    {i < Math.min(src.experimentIds.length, 4) - 1 ? ", " : ""}
                                  </span>
                                ))}
                              </p>
                            ) : null}
                          </div>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ink-muted hover:text-ink mt-0.5 shrink-0 transition-colors"
                            aria-label={`Open ${tidy(src.title)} at NASA (new tab)`}
                          >
                            <ExternalLink className="size-4" strokeWidth={1.5} />
                          </a>
                        </li>
                      ))}
                  </ol>
                </details>
              ))}
          </div>
        </article>
      </div>
    </>
  );
}
