"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Link2 } from "lucide-react";
import { notify } from "@/lib/notify";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useFullCatalog } from "@/hooks/use-full-catalog";
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
  if (!needle || i < 0) return <p className="text-ink-muted text-sm leading-relaxed">{norm}</p>;
  return (
    <p className="text-ink-muted text-sm leading-relaxed">
      {norm.slice(0, i)}
      <mark className="bg-flame-core/20 text-ink ring-flame-core/40 rounded px-0.5 ring-1">
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
  // The fetched chunk is stored with its id, so loading / error / stale states are derived rather than reset in an effect.
  const [result, setResult] = useState<{ id: string; chunk: Chunk | null; failed: boolean } | null>(null);
  const source = target ? sourceById.get(target.sourceId) : undefined;
  // Authors, DOI, licence and linked experiments come from the full catalogue (fetched once, on first open).
  const full = useFullCatalog();
  const details = target ? full?.sourceById.get(target.sourceId) : undefined;
  const wanted = target?.chunkId;
  const current = wanted && result?.id === wanted ? result : null;
  const chunk = current?.chunk ?? null;
  const state: "idle" | "loading" | "error" = !wanted
    ? "idle"
    : !current
      ? "loading"
      : current.failed
        ? "error"
        : "idle";

  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    fetch(`/api/chunk?id=${encodeURIComponent(wanted)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { chunk: Chunk }) => {
        if (!cancelled) setResult({ id: wanted, chunk: json.chunk, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult({ id: wanted, chunk: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [wanted]);

  const page = target?.page ?? chunk?.page;

  return (
    <Sheet open={Boolean(target)} onOpenChange={(o) => !o && close()}>
      <SheetContent side="right" className="border-line bg-elev-2 w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-line border-b px-6 pt-6 pb-5">
          <p className="text-ink-muted flex items-center gap-2 font-mono text-xs">
            <FileText className="size-3.5" strokeWidth={1.5} aria-hidden />
            {source ? TYPE_LABEL[source.type] : "Source"}
            {details?.accession ? ` · ${details.accession}` : ""}
            {page ? ` · page ${page}` : ""}
          </p>
          <SheetTitle className="text-ink mt-2 pr-8 text-lg leading-snug font-medium">
            {source?.title ?? target?.sourceId ?? "Source"}
          </SheetTitle>
          <SheetDescription className="text-ink-muted text-sm">
            {[details?.authors?.slice(0, 3).join(", "), details?.year, details?.publisher]
              .filter(Boolean)
              .join(" · ") || "Provenance record"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 py-6">
          {target?.chunkId ? (
            <section aria-label="Cited passage">
              <h3 className="text-ink-muted text-xs font-medium">Cited passage</h3>
              <div className="border-line bg-elev-1 mt-2 rounded-2xl border p-4">
                {state === "loading" ? <SkeletonLines lines={5} /> : null}
                {state === "error" ? (
                  <ErrorNotice title="Could not load the cited passage." body="The source link below still works." />
                ) : null}
                {chunk && state === "idle" ? <Highlighted text={chunk.text} excerpt={target.excerpt} /> : null}
              </div>
              <p className="text-2xs text-ink-faint mt-2 font-mono">{target.chunkId}</p>
            </section>
          ) : null}

          {details ? (
            <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm">
              {details.doi ? (
                <>
                  <dt className="text-ink-muted">DOI</dt>
                  <dd className="text-ink font-mono text-xs break-all">{details.doi}</dd>
                </>
              ) : null}
              {details.license ? (
                <>
                  <dt className="text-ink-muted">Licence</dt>
                  <dd className="text-ink">{details.license}</dd>
                </>
              ) : null}
              {details.experimentIds.length ? (
                <>
                  <dt className="text-ink-muted">Experiments</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {details.experimentIds.map((id) => (
                      <Link
                        key={id}
                        href={`/experiments/${id}`}
                        onClick={close}
                        className="border-line-strong text-ink hover:border-flame-micro/50 rounded-full border px-2 py-0.5 text-xs"
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
                className="bg-ink text-canvas inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-white"
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
                    .then(() => notify("success", "Source link copied"))
                    .catch(() => notify("error", "Copy failed"));
                }}
                className="border-line-strong text-ink inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm hover:bg-white/[0.05]"
              >
                <Link2 className="size-3.5" strokeWidth={1.5} aria-hidden /> Copy link
              </button>
            ) : null}
          </div>
          <p className="text-ink-faint text-xs leading-relaxed">
            EMBER shows short excerpts only and links to the original NASA record. PDFs are not re-hosted.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
