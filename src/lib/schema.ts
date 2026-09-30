import { z } from "zod";

/**
 * EMBER data contracts (project.md §9.2–9.3). Every JSON file in data/processed is validated
 * against these schemas by scripts/ts/validate-data.ts, and the UI types are inferred from them.
 */

// ---------- shared ----------

export const RangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
    /** Free-text qualifier copied from the source, e.g. "approximate" or "varied between tests". */
    note: z.string().optional(),
  })
  .refine((r) => r.min <= r.max, { message: "Range min must be ≤ max" });
export type Range = z.infer<typeof RangeSchema>;

export const MissionIdSchema = z.enum(["iss", "gateway", "lunar", "marsTransit", "marsSurface"]);
export type MissionId = z.infer<typeof MissionIdSchema>;

// ---------- sources ----------

export const SourceTypeSchema = z.enum(["psi-dataset", "ntrs-report", "journal", "nasa-web", "presentation"]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const SourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  authors: z.array(z.string()).optional(),
  year: z.number().int().min(1950).max(2100).optional(),
  type: SourceTypeSchema,
  url: z.url(),
  accessed: z.iso.date(),
  license: z.string().optional(),
  /** Relative path under data/raw when a local copy exists (never re-hosted). */
  localPath: z.string().optional(),
  doi: z.string().optional(),
  /** PSI accession (e.g. PSI-25) or NTRS id (e.g. 20170002628). */
  accession: z.string().optional(),
  /** Experiments this source documents. */
  experimentIds: z.array(z.string()).default([]),
  publisher: z.string().optional(),
  /** Plain-language note on what the source contains. */
  note: z.string().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

// ---------- experiments ----------

export const ExperimentCategorySchema = z.enum([
  "droplet",
  "solid",
  "gaseous-premixed",
  "gaseous-nonpremixed",
  "smoke",
  "suppression",
  "large-scale",
]);
export type ExperimentCategory = z.infer<typeof ExperimentCategorySchema>;

export const PlatformSchema = z.enum([
  "ISS",
  "Cygnus",
  "Space Shuttle",
  "Drop tower",
  "Parabolic aircraft",
  "Sounding rocket",
  "Ground",
]);
export type Platform = z.infer<typeof PlatformSchema>;

export const ConditionsSchema = z.object({
  o2Percent: RangeSchema.optional(),
  pressureKpa: RangeSchema.optional(),
  flowCmS: RangeSchema.optional(),
  gravityG: RangeSchema.optional(),
  diluent: z.array(z.string()).optional(),
});
export type Conditions = z.infer<typeof ConditionsSchema>;

export const ExperimentSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "experiment id must be a lowercase slug"),
  acronym: z.string().min(1),
  fullName: z.string().min(1),
  category: z.array(ExperimentCategorySchema).min(1),
  platform: PlatformSchema,
  facility: z.string().optional(),
  years: z.object({ start: z.number().int(), end: z.number().int().optional() }),
  /** Source of the year range when it is derived (e.g. from test dates) rather than stated. */
  yearsNote: z.string().optional(),
  agencies: z.array(z.string()),
  fuels: z.array(z.string()),
  conditions: ConditionsSchema,
  /** Source ids supporting the condition ranges above. */
  conditionsSourceIds: z.array(z.string()).default([]),
  objectives: z.string().min(1),
  summaryPlain: z.string().min(1),
  whyItMatters: z.string().min(1),
  psiUrl: z.url().optional(),
  psiAccession: z.string().optional(),
  doi: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  sourceIds: z.array(z.string()).min(1, "every experiment needs at least one source"),
  hasRawData: z.boolean(),
  /** Only a human reviewer may set this to true. */
  verified: z.boolean(),
  /** Number of peer-reviewed publications PSI lists for the investigation. */
  publicationCount: z.number().int().min(0).optional(),
  kind: z.enum(["flight", "ground"]),
});
export type Experiment = z.infer<typeof ExperimentSchema>;

// ---------- findings ----------

export const FindingCategorySchema = z.enum([
  "ignition",
  "flame-spread",
  "extinction",
  "suppression",
  "smoke-detection",
  "materials",
  "cool-flames",
  "scale-effects",
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

export const EvidenceSchema = z.object({
  sourceId: z.string().min(1),
  page: z.number().int().min(1).optional(),
  chunkId: z.string().min(1),
  /** ≤ 25 words, must be a verbatim substring of the chunk text (checked by validate-data). */
  excerpt: z
    .string()
    .min(1)
    .refine((s) => s.trim().split(/\s+/).length <= 25, { message: "excerpt must be ≤ 25 words" }),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

const score03 = z.number().int().min(0).max(3);
const score15 = z.number().int().min(1).max(5);

export const MissionRelevanceSchema = z.object({
  iss: score03,
  gateway: score03,
  lunar: score03,
  marsTransit: score03,
  marsSurface: score03,
});
export type MissionRelevance = z.infer<typeof MissionRelevanceSchema>;

export const FindingStatusSchema = z.enum(["ai-draft", "verified", "rejected"]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

export const FindingSchema = z.object({
  id: z.string().min(1),
  experimentId: z.string().min(1),
  statement: z.string().min(1),
  plainLanguage: z.string().min(1),
  category: FindingCategorySchema,
  safetyImplication: z.string().min(1),
  evidence: z.array(EvidenceSchema).min(1, "every finding needs evidence"),
  missionRelevance: MissionRelevanceSchema,
  severity: score15,
  actionability: score15,
  evidenceStrength: score15,
  confidence: z.enum(["high", "medium", "low"]),
  status: FindingStatusSchema,
  reviewer: z.string().optional(),
  /** Short rationale for the mission-relevance scores (shown in the score breakdown). */
  relevanceNote: z.string().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

// ---------- measurements ----------

export const GeometrySchema = z.enum(["thin-sheet", "thick", "droplet", "wire", "gas-jet", "cylinder"]);
export type Geometry = z.infer<typeof GeometrySchema>;

export const OutcomeSchema = z.enum(["burned", "self-extinguished", "no-ignition", "extinguished-by-agent"]);
export type Outcome = z.infer<typeof OutcomeSchema>;

export const MeasurementSchema = z.object({
  id: z.string().min(1),
  experimentId: z.string().min(1),
  testId: z.string().min(1),
  fuel: z.string().min(1),
  /** Normalized family used by the Lens flammability map (e.g. "PMMA", "cotton-fiberglass", "n-alkane droplet"). */
  fuelFamily: z.string().min(1),
  geometry: GeometrySchema,
  thicknessMm: z.number().positive().optional(),
  o2Percent: z.number().min(0).max(100).optional(),
  pressureKpa: z.number().positive().optional(),
  flowCmS: z.number().min(0).optional(),
  gravityG: z.number().min(0).max(1.5),
  outcome: OutcomeSchema,
  spreadRateMmS: z.number().min(0).optional(),
  burnDurationS: z.number().min(0).optional(),
  diluent: z.string().optional(),
  sourceId: z.string().min(1),
  page: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  /** The raw outcome text from the source before mapping to the enum. */
  rawOutcome: z.string().optional(),
});
export type Measurement = z.infer<typeof MeasurementSchema>;

// ---------- knowledge base ----------

export const ChunkSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  experimentIds: z.array(z.string()),
  page: z.number().int().min(1).optional(),
  text: z.string().min(1),
  tokens: z.number().int().positive(),
});
export type Chunk = z.infer<typeof ChunkSchema>;

export const GlossaryTermSchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1),
  short: z.string().min(1),
  definition: z.string().min(1),
  related: z.array(z.string()).default([]),
});
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;

export const CitationSchema = z.object({
  chunkId: z.string(),
  sourceId: z.string(),
  page: z.number().int().optional(),
  label: z.string(),
  /** Verbatim passage to highlight in the SourceDrawer (digest citations point at a finding's evidence excerpt). */
  excerpt: z.string().optional(),
});
export type Citation = z.infer<typeof CitationSchema>;

export const PrecomputedAnswerSchema = z.object({
  id: z.string(),
  question: z.string(),
  mission: MissionIdSchema.optional(),
  kind: z.enum(["suggested", "digest", "out-of-scope"]),
  answer: z.string(),
  citations: z.array(CitationSchema),
  confidence: z.enum(["high", "medium", "low", "none"]),
  notCovered: z.string().optional(),
  generatedBy: z.string(),
  generatedAt: z.iso.datetime(),
});
export type PrecomputedAnswer = z.infer<typeof PrecomputedAnswerSchema>;

// ---------- collections ----------

export const SourcesFileSchema = z.array(SourceSchema);
export const ExperimentsFileSchema = z.array(ExperimentSchema);
export const FindingsFileSchema = z.array(FindingSchema);
export const MeasurementsFileSchema = z.array(MeasurementSchema);
export const ChunksFileSchema = z.array(ChunkSchema);
export const GlossaryFileSchema = z.array(GlossaryTermSchema);
export const PrecomputedAnswersFileSchema = z.array(PrecomputedAnswerSchema);
