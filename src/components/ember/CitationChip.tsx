"use client";

import { FileText } from "lucide-react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useSourceDrawer } from "@/lib/stores";
import { cn } from "@/lib/utils";

/** `[FLEX · p.4]` chip. Opens the global SourceDrawer with the cited chunk highlighted. */
export function CitationChip({
  sourceId,
  chunkId,
  page,
  excerpt,
  index,
  className,
}: {
  sourceId: string;
  chunkId?: string;
  page?: number;
  excerpt?: string;
  index?: number;
  className?: string;
}) {
  const { sourceById } = useCatalog();
  const open = useSourceDrawer((s) => s.open);
  const source = sourceById.get(sourceId);
  const label = source?.label ?? sourceId;
  return (
    <button
      type="button"
      onClick={() => open({ sourceId, chunkId, page, excerpt })}
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border border-line-strong bg-elev-2 px-1.5 py-0.5 align-baseline font-mono text-[11px] leading-4 text-ink-muted transition-colors duration-150 hover:border-flame-micro/50 hover:text-ink focus-visible:outline-2 focus-visible:outline-flame-micro",
        className,
      )}
      aria-label={`Open source: ${source?.title ?? sourceId}${page ? `, page ${page}` : ""}`}
    >
      {index !== undefined ? (
        <span className="text-flame-micro tabular">{index}</span>
      ) : (
        <FileText className="size-3" strokeWidth={1.5} aria-hidden />
      )}
      <span className="truncate">
        {label}
        {page ? ` · p.${page}` : ""}
      </span>
    </button>
  );
}
