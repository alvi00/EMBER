"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { SkeletonLines, ErrorNotice } from "@/components/ember/states";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSourceDrawer } from "@/lib/stores";
import type { Chunk } from "@/lib/schema";

const TYPE_LABEL: Record<string, string> = {
  "psi-dataset": "NASA PSI dataset",
  "ntrs-report": "NTRS report",
  journal: "Journal article",
  "nasa-web": "NASA web page",
  presentation: "Presentation",
};

function Highlighted({ text, excerpt }: { text: string; excerpt?: string }) {
  const norm = text.replace(/\s+/g, " ");
  const needle = excerpt?.replace(/\s+/g, " ").trim();
  const i = needle ? norm.indexOf(needle) : -1;
  if (!needle || i < 0) return <p className="text-sm leading-relaxed text-ink-muted">{norm}</p>;
  return (
    <p className="text-sm leading-relaxed text-ink-muted">
      {norm.slice(0, i)}
      <mark className="rounded bg-flame-core/20 px-0.5 text-ink ring-1 ring-flame-core/40">
        {norm.slice(i, i + needle.length)}
      </mark>
      {norm.slice(i + needle.length)}
    </p>
  );
}

/** Global drawer showing a source's provenance and the exact cited chunk, with a link to the original. */
export function SourceDrawer() {
  const { target, close } = useSourceDrawer();
  const { sourceById, experimentById } = useCatalog();
  const [chunk, setChunk] = useState<Chunk | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const source = target ? sourceById.get(target.sourceId) : undefined;

  useEffect(() => {
    if (!target?.chunkId) {
      setChunk(null);
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    fetch(`/api/chunk?id=${encodeURIComponent(target.chunkId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { chunk: Chunk }) => {
        if (!cancelled) {
          setChunk(json.chunk);
          setState("idle");
        }
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [target?.chunkId]);

  const page = target?.page ?? chunk?.page;

  return (
    <Sheet open={Boolean(target)} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto border-line bg-elev-2 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-line px-6 pt-6 pb-5">
          <p className="flex items-center gap-2 font-mono text-xs text-ink-muted">
            <FileText className="size-3.5" strokeWidth={1.5} aria-hidden />
            {source ? TYPE_LABEL[source.type] : "Source"}
            {source?.accession ? ` · ${source.accession}` : ""}
            {page ? ` · page ${page}` : ""}
          </p>
          <SheetTitle className="mt-2 pr-8 text-lg leading-snug font-medium text-ink">
            {source?.title ?? target?.sourceId ?? "Source"}
          </SheetTitle>
          <SheetDescription className="text-sm text-ink-muted">
            {[source?.authors?.slice(0, 3).join(", "), source?.year, source?.publisher].filter(Boolean).join(" · ") ||
              "Provenance record"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 py-6">
          {target?.chunkId ? (
            <section aria-label="Cited passage">
              <h3 className="text-xs font-medium text-ink-muted">Cited passage</h3>
              <div className="mt-2 rounded-2xl border border-line bg-elev-1 p-4">
                {state === "loading" ? <SkeletonLines lines={5} /> : null}
                {state === "error" ? (
                  <ErrorNotice title="Could not load the cited passage." body="The source link below still works." />
                ) : null}
                {chunk && state === "idle" ? <Highlighted text={chunk.text} excerpt={target.excerpt} /> : null}
              </div>
              <p className="mt-2 font-mono text-2xs text-ink-faint">{target.chunkId}</p>
            </section>
          ) : null}

          {source ? (
            <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm">
              {source.doi ? (
                <>
                  <dt className="text-ink-muted">DOI</dt>
                  <dd className="font-mono text-xs break-all text-ink">{source.doi}</dd>
                </>
              ) : null}
              {source.license ? (
                <>
                  <dt className="text-ink-muted">Licence</dt>
                  <dd className="text-ink">{source.license}</dd>
                </>
              ) : null}
              {source.experimentIds.length ? (
                <>
                  <dt className="text-ink-muted">Experiments</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {source.experimentIds.map((id) => (
                      <Link
                        key={id}
                        href={`/experiments/${id}`}
                        onClick={close}
                        className="rounded-full border border-line-strong px-2 py-0.5 text-xs text-ink hover:border-flame-micro/50"
                      >
                        {experimentById.get(id)?.acronym ?? id}
                      </Link>
                    ))}
                  </dd>
                </>
              ) : null}
            </dl>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {source ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-canvas transition-colors hover:bg-white"
              >
                Open original <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden />
              </a>
            ) : null}
            {source ? (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(source.url)
                    .then(() => toast.success("Source link copied"))
                    .catch(() => toast.error("Copy failed"));
                }}
                className="inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-sm text-ink hover:bg-white/[0.05]"
              >
                <Link2 className="size-3.5" strokeWidth={1.5} aria-hidden /> Copy link
              </button>
            ) : null}
          </div>
          <p className="text-xs leading-relaxed text-ink-faint">
            EMBER shows short excerpts only and links to the original NASA record. PDFs are not re-hosted.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
