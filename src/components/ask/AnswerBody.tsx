"use client";

import { Fragment } from "react";
import { CitationChip } from "@/components/ember/CitationChip";
import { normalizeAnswer, segmentAnswer, type AliasMap } from "@/lib/ai/citations";
import { cn } from "@/lib/utils";

type Block = { kind: "h"; text: string } | { kind: "ul" | "ol"; items: string[] } | { kind: "p"; text: string };

/** A deliberately small Markdown subset (headings, lists, paragraphs, bold/italic/code). Rendered as React text only. */
export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  for (const rawLine of normalizeAnswer(text).split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushPara();
      continue;
    }
    const heading = line.match(/^#{1,4}\s+(.*)$/) ?? line.match(/^\*\*([^*]+)\*\*:?$/);
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (heading) {
      flushPara();
      blocks.push({ kind: "h", text: heading[1].replace(/\*\*/g, "") });
    } else if (bullet || numbered) {
      flushPara();
      const kind = bullet ? "ul" : "ol";
      const item = (bullet ?? numbered)![1];
      const last = blocks[blocks.length - 1];
      if (last && last.kind === kind) last.items.push(item);
      else blocks.push({ kind, items: [item] });
    } else if (/^\|/.test(line) || /^-{3,}$/.test(line)) {
      // Tables and rules are not part of the answer format; keep table text readable as a paragraph line.
      if (/^\|/.test(line) && !/^\|[\s:|-]+\|$/.test(line)) para.push(line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()).join(" · "));
    } else {
      para.push(line);
    }
  }
  flushPara();
  return blocks;
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={i} className="font-medium text-ink">{p.slice(2, -2)}</strong>;
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
        if (p.startsWith("`") && p.endsWith("`") && p.length > 2) return <code key={i} className="rounded bg-elev-3 px-1 font-mono text-[0.85em]">{p.slice(1, -1)}</code>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

function Cited({ text, aliases }: { text: string; aliases: AliasMap }) {
  const { segments } = segmentAnswer(text, aliases);
  return (
    <>
      {segments.map((s, i) =>
        s.type === "text" ? (
          <Inline key={i} text={s.text} />
        ) : (
          <CitationChip
            key={i}
            index={Number(s.alias.slice(1))}
            sourceId={s.sourceId}
            chunkId={s.chunkId}
            page={s.page}
            excerpt={s.excerpt}
            className="mx-0.5 -translate-y-px"
          />
        ),
      )}
    </>
  );
}

/** Renders an answer (streaming or complete). Citations become chips that open the SourceDrawer at the passage. */
export function AnswerBody({ text, aliases, streaming = false, className }: { text: string; aliases: AliasMap; streaming?: boolean; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={cn("space-y-3 text-[15px] leading-relaxed text-ink-muted", className)}>
      {blocks.map((b, i) => {
        const last = i === blocks.length - 1;
        const caret = streaming && last ? <span aria-hidden className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-flame-core motion-reduce:animate-none" /> : null;
        if (b.kind === "h") {
          return (
            <h3 key={i} className="pt-2 text-xs font-medium tracking-[0.14em] text-ink uppercase first:pt-0">
              {b.text}
              {caret}
            </h3>
          );
        }
        if ("items" in b) {
          const List = b.kind === "ul" ? "ul" : "ol";
          return (
            <List key={i} className={cn("space-y-2 pl-5", b.kind === "ul" ? "list-disc marker:text-ink-faint" : "list-decimal marker:text-ink-faint")}>
              {b.items.map((item, j) => (
                <li key={j} className="pl-1">
                  <Cited text={item} aliases={aliases} />
                  {last && j === b.items.length - 1 ? caret : null}
                </li>
              ))}
            </List>
          );
        }
        return (
          <p key={i}>
            <Cited text={b.text} aliases={aliases} />
            {caret}
          </p>
        );
      })}
      {streaming && !blocks.length ? <span aria-hidden className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-flame-core motion-reduce:animate-none" /> : null}
    </div>
  );
}
