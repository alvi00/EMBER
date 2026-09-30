/** Highlights search terms inside text (case-insensitive, whole-text safe). */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const clean = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).filter(Boolean);
  if (!clean.length) return <>{text}</>;
  const re = new RegExp(`(${clean.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-flame-core/20 px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
