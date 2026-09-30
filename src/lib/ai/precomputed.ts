import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrecomputedAnswersFileSchema, type MissionId, type PrecomputedAnswer } from "@/lib/schema";

/**
 * Precomputed answers (project.md §10.6): suggested questions, mission digests and out-of-scope checks, generated
 * by `scripts/ts/precompute-answers.ts` so the demo works with the network off. Read at runtime (not imported) so the
 * app still builds before the script has run.
 */
let cache: PrecomputedAnswer[] | null = null;

export function loadPrecomputed(): PrecomputedAnswer[] {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "processed", "precomputed-answers.json");
  if (!existsSync(file)) return (cache = []);
  const parsed = PrecomputedAnswersFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    console.warn("EMBER: precomputed-answers.json failed validation; offline answers disabled.");
    return (cache = []);
  }
  return (cache = parsed.data);
}

export function precomputedDigest(missionId: MissionId): PrecomputedAnswer | undefined {
  return loadPrecomputed().find((a) => a.kind === "digest" && a.mission === missionId);
}

export function precomputedDigests(): Partial<Record<MissionId, PrecomputedAnswer>> {
  const out: Partial<Record<MissionId, PrecomputedAnswer>> = {};
  for (const a of loadPrecomputed()) if (a.kind === "digest" && a.mission) out[a.mission] = a;
  return out;
}
