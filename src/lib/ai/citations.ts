/**
 * Citation post-processing (project.md §10.3) — shared by server (validation) and client (rendering).
 * The model writes [[S#]] aliases; `aliases` maps them to retrieved chunk ids. Any alias that was not retrieved is a
 * fabricated citation: it is stripped and its sentence is flagged.
 */
export type AliasMap = Record<string, { chunkId: string; sourceId: string; page?: number; label: string; excerpt?: string }>;

export type Segment =
  | { type: "text"; text: string }
  | { type: "cite"; alias: string; chunkId: string; sourceId: string; page?: number; label: string; excerpt?: string };

const CITE_RE = /\[\[\s*([^\]]+?)\s*\]\]/g;

/**
 * Models do not always follow the [[S#]] format exactly (gpt-oss prefers 【S1】 or 【S1†L3】, others write [S1]).
 * Normalise every variant to [[S#]] and tidy typography (non-breaking hyphens) before parsing or rendering.
 */
export function normalizeAnswer(text: string): string {
  return text
    .replace(/‑/g, "-")
    .replace(/【\s*(S\d+)(?:[^】\n]*)】/gi, "[[$1]]")
    .replace(/(?<!\[)\[\s*(S\d+(?:\s*,\s*S\d+)*)\s*\](?!\])/gi, "[[$1]]")
    .replace(/\]\]\s*\[\[/g, "]][[");
}

/** Split text into text + citation segments, dropping invalid citations. Incomplete trailing markers are hidden. */
export function segmentAnswer(text: string, aliases: AliasMap): { segments: Segment[]; invalid: string[] } {
  const segments: Segment[] = [];
  const invalid: string[] = [];
  const visible = normalizeAnswer(text).replace(/(\[\[[^\]]*|\[\[[^\]]*\]|【[^】]*|\[S?\d*)$/, "");
  let last = 0;
  for (const m of visible.matchAll(CITE_RE)) {
    if (m.index! > last) segments.push({ type: "text", text: visible.slice(last, m.index) });
    for (const raw of m[1].split(/[,\s]+/).filter(Boolean)) {
      const alias = raw.toUpperCase();
      const hit = aliases[alias];
      if (hit) segments.push({ type: "cite", alias, ...hit });
      else invalid.push(raw);
    }
    last = m.index! + m[0].length;
  }
  if (last < visible.length) segments.push({ type: "text", text: visible.slice(last) });
  return { segments, invalid };
}

/** Sentences that contained a stripped (fabricated) citation — shown with a warning marker. */
export function flaggedSentences(text: string, aliases: AliasMap): string[] {
  const out: string[] = [];
  for (const sentence of normalizeAnswer(text).split(/(?<=[.!?])\s+/)) {
    const cites = Array.from(sentence.matchAll(CITE_RE)).flatMap((m) => m[1].split(/[,\s]+/));
    if (cites.some((c) => c && !aliases[c.toUpperCase()])) out.push(sentence.replace(CITE_RE, "").trim());
  }
  return out;
}

export function usedAliases(text: string, aliases: AliasMap): string[] {
  const used = new Set<string>();
  for (const m of normalizeAnswer(text).matchAll(CITE_RE)) {
    for (const raw of m[1].split(/[,\s]+/)) if (aliases[raw.toUpperCase()]) used.add(raw.toUpperCase());
  }
  return Array.from(used);
}
