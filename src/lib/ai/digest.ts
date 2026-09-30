import "server-only";
import { generateText } from "ai";
import { findings, getExperiment } from "@/lib/data";
import { getMission } from "@/lib/missions";
import type { Citation, MissionId } from "@/lib/schema";
import { rankFindings } from "@/lib/scoring";
import type { AliasMap } from "@/lib/ai/citations";
import { digestInstructions, digestPrompt, type PromptPassage } from "@/lib/ai/prompts";
import { getModel, providerOptions } from "@/lib/ai/provider";

/**
 * Mission Control evidence digest (project.md §7, §10): the six top-ranked findings for a mission are handed to the
 * model as aliased passages; every sentence of the digest must cite one of them. Each alias resolves to the finding's
 * first evidence excerpt, so a click opens the NASA source at the quoted passage.
 */
export const DIGEST_FINDINGS = 6;

export function digestInputs(missionId: MissionId): { passages: PromptPassage[]; aliases: AliasMap; citations: Citation[] } {
  const top = rankFindings(findings, missionId).slice(0, DIGEST_FINDINGS);
  const aliases: AliasMap = {};
  const citations: Citation[] = [];
  const passages = top.map((r, i) => {
    const f = r.finding;
    const ev = f.evidence[0];
    const alias = `S${i + 1}`;
    const acronym = getExperiment(f.experimentId)?.acronym ?? f.experimentId;
    const label = `${acronym}${ev.page ? ` · p.${ev.page}` : ""}`;
    aliases[alias] = { chunkId: ev.chunkId, sourceId: ev.sourceId, page: ev.page, label, excerpt: ev.excerpt };
    citations.push({ chunkId: ev.chunkId, sourceId: ev.sourceId, page: ev.page, label, excerpt: ev.excerpt });
    const status = f.status === "verified" ? "human-verified finding" : "AI-drafted finding, not yet human-verified";
    return {
      alias,
      label: `${acronym}, ${status}`,
      text: `${f.statement} Safety implication: ${f.safetyImplication} Evidence quote: "${ev.excerpt}"`,
    };
  });
  return { passages, aliases, citations };
}

export async function generateDigest(missionId: MissionId): Promise<{ text: string; aliases: AliasMap; citations: Citation[]; generatedBy: string } | null> {
  const resolved = await getModel();
  if (!resolved) return null;
  const { passages, aliases, citations } = digestInputs(missionId);
  const { text } = await generateText({
    model: resolved.model,
    instructions: digestInstructions(),
    prompt: digestPrompt(getMission(missionId).label, passages),
    temperature: 0.2,
    maxOutputTokens: 900,
    maxRetries: 1,
    timeout: 45_000,
    providerOptions: providerOptions(resolved.provider, resolved.modelId),
  });
  return { text: text.trim(), aliases, citations, generatedBy: `${resolved.provider}:${resolved.modelId}` };
}
