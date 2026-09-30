/** Display helpers for text that comes from sources (titles etc.). Quotes/excerpts are never altered. */
export function tidy(text: string): string {
  return text
    .replace(/\s+—\s+/g, ", ")
    .replace(/—/g, "-")
    .replace(/\s*–\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "")}…`;
}

export function formatRange(min: number, max: number, unit: string, digits = 1): string {
  const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(digits));
  return min === max ? `${f(min)} ${unit}` : `${f(min)}-${f(max)} ${unit}`;
}
