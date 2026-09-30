"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check, ChevronLeft, ChevronRight, ExternalLink, PencilLine, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Finding, FindingCategory, MissionRelevance } from "@/lib/schema";

export type ReviewItem = {
  finding: Finding;
  experiment: { id: string; acronym: string };
  evidence: (Finding["evidence"][number] & { chunkText: string; sourceTitle: string; sourceUrl: string })[];
};

const CATEGORIES: FindingCategory[] = [
  "ignition",
  "flame-spread",
  "extinction",
  "suppression",
  "smoke-detection",
  "materials",
  "cool-flames",
  "scale-effects",
];
const MISSIONS: { key: keyof MissionRelevance; label: string }[] = [
  { key: "iss", label: "ISS" },
  { key: "gateway", label: "Gateway" },
  { key: "lunar", label: "Lunar" },
  { key: "marsTransit", label: "Mars transit" },
  { key: "marsSurface", label: "Mars surface" },
];
const REVIEWER_KEY = "ember-reviewer";

function Highlighted({ text, excerpt }: { text: string; excerpt: string }) {
  const norm = text.replace(/\s+/g, " ");
  const i = norm.indexOf(excerpt);
  if (i < 0) return <p className="text-sm leading-relaxed text-ink-muted">{norm}</p>;
  return (
    <p className="text-sm leading-relaxed text-ink-muted">
      {norm.slice(0, i)}
      <mark className="rounded bg-flame-core/20 px-0.5 text-ink ring-1 ring-flame-core/40">{norm.slice(i, i + excerpt.length)}</mark>
      {norm.slice(i + excerpt.length)}
    </p>
  );
}

function StatusPill({ status, reviewer }: { status: Finding["status"]; reviewer?: string }) {
  const map = {
    "ai-draft": { label: "AI draft — pending review", cls: "border-flame-violet/40 text-flame-violet-text" },
    verified: { label: `Verified${reviewer ? ` by ${reviewer}` : ""}`, cls: "border-ok/40 text-ok" },
    rejected: { label: `Rejected${reviewer ? ` by ${reviewer}` : ""}`, cls: "border-danger/40 text-danger" },
  } as const;
  const s = map[status];
  return <span className={cn("rounded-full border px-2.5 py-0.5 font-mono text-xs", s.cls)}>{s.label}</span>;
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readReviewer(): string {
  try {
    return localStorage.getItem(REVIEWER_KEY) ?? "";
  } catch {
    return "";
  }
}

export function ReviewClient({ items: initial }: { items: ReviewItem[] }) {
  const [items, setItems] = useState(initial);
  const [index, setIndex] = useState(() => Math.max(0, initial.findIndex((i) => i.finding.status === "ai-draft")));
  // Reviewer name: remembered in localStorage (read after hydration via useSyncExternalStore), overridden by typing.
  const storedReviewer = useSyncExternalStore(subscribeStorage, readReviewer, () => "");
  const [typedReviewer, setReviewer] = useState<string | null>(null);
  const reviewer = typedReviewer ?? storedReviewer;
  const [busy, setBusy] = useState(false);
  const current = items[index];
  const [draft, setDraft] = useState<Finding>(current?.finding);
  // Load the selected finding into the editor whenever the selection (or its saved copy) changes.
  const [draftFor, setDraftFor] = useState(current);
  if (current && draftFor !== current) {
    setDraftFor(current);
    setDraft(current.finding);
  }

  const counts = useMemo(
    () => ({
      draft: items.filter((i) => i.finding.status === "ai-draft").length,
      verified: items.filter((i) => i.finding.status === "verified").length,
      rejected: items.filter((i) => i.finding.status === "rejected").length,
    }),
    [items],
  );

  const submit = useCallback(
    async (action: "verify" | "edit-verify" | "reject" | "reset") => {
      if (!current || busy) return;
      if (reviewer.trim().length < 2) {
        toast.error("Enter your name before reviewing.");
        document.getElementById("reviewer")?.focus();
        return;
      }
      setBusy(true);
      try {
        const patch =
          action === "edit-verify"
            ? {
                statement: draft.statement,
                plainLanguage: draft.plainLanguage,
                safetyImplication: draft.safetyImplication,
                category: draft.category,
                severity: draft.severity,
                actionability: draft.actionability,
                evidenceStrength: draft.evidenceStrength,
                confidence: draft.confidence,
                missionRelevance: draft.missionRelevance,
              }
            : undefined;
        const res = await fetch("/api/review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: current.finding.id, action, reviewer: reviewer.trim(), patch }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Save failed");
        setItems((prev) => prev.map((it, i) => (i === index ? { ...it, finding: json.finding } : it)));
        toast.success(
          action === "reject" ? "Rejected" : action === "reset" ? "Reset to AI draft" : "Verified — saved to findings.json",
        );
        if (action !== "reset") setIndex((i) => Math.min(items.length - 1, i + 1));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      } finally {
        setBusy(false);
      }
    },
    [busy, current, draft, index, items.length, reviewer],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "j") setIndex((i) => Math.min(items.length - 1, i + 1));
      else if (k === "k") setIndex((i) => Math.max(0, i - 1));
      else if (k === "v") void submit("verify");
      else if (k === "e") void submit("edit-verify");
      else if (k === "r") void submit("reject");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length, submit]);

  if (!current || !draft) {
    return <p className="mt-10 text-ink-muted">No findings to review yet. Run the extraction script first.</p>;
  }

  const field =
    "w-full rounded-xl border border-line-strong bg-elev-2 px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-flame-micro";

  return (
    <div className="mt-8">
      <div className="surface flex flex-wrap items-center gap-4 px-5 py-4">
        <label htmlFor="reviewer" className="text-sm text-ink-muted">
          Reviewer
        </label>
        <input
          id="reviewer"
          value={reviewer}
          onChange={(e) => {
            setReviewer(e.target.value);
            try {
              localStorage.setItem(REVIEWER_KEY, e.target.value);
            } catch {
              /* storage unavailable */
            }
          }}
          placeholder="Your name"
          className={cn(field, "max-w-56")}
        />
        <p className="font-mono text-xs text-ink-muted tabular">
          {counts.draft} draft · {counts.verified} verified · {counts.rejected} rejected · {items.length} total
        </p>
        <p className="ml-auto font-mono text-xs text-ink-muted">
          <kbd>V</kbd> verify · <kbd>E</kbd> edit & verify · <kbd>R</kbd> reject · <kbd>J</kbd>/<kbd>K</kbd> next/prev
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ChevronLeft /> Prev
        </Button>
        <p className="font-mono text-sm tabular">
          {index + 1} / {items.length} · {current.finding.id} · {current.experiment.acronym}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
          disabled={index === items.length - 1}
        >
          Next <ChevronRight />
        </Button>
        <StatusPill status={current.finding.status} reviewer={current.finding.reviewer} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-label="Source evidence" className="surface space-y-5 p-5">
          <h2 className="eyebrow">Source evidence</h2>
          {current.evidence.map((ev, i) => (
            <div key={`${ev.chunkId}-${i}`} className="space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">{ev.sourceTitle}</p>
                <a
                  href={ev.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-flame-micro hover:underline"
                >
                  {ev.page ? `p.${ev.page} · ` : ""}open source <ExternalLink className="size-3" />
                </a>
              </div>
              <p className="font-mono text-2xs text-ink-faint">{ev.chunkId}</p>
              <div className="max-h-80 overflow-auto rounded-xl border border-line bg-elev-2 p-4">
                <Highlighted text={ev.chunkText} excerpt={ev.excerpt} />
              </div>
            </div>
          ))}
        </section>

        <section aria-label="Finding fields" className="surface space-y-4 p-5">
          <h2 className="eyebrow">Finding (editable)</h2>
          {(["statement", "plainLanguage", "safetyImplication"] as const).map((key) => (
            <div key={key}>
              <label htmlFor={key} className="text-xs text-ink-muted">
                {key === "plainLanguage" ? "Plain language" : key === "safetyImplication" ? "Safety implication" : "Statement"}
              </label>
              <textarea
                id={key}
                rows={key === "statement" ? 4 : 3}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                className={cn(field, "mt-1 resize-y")}
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <label htmlFor="category" className="text-xs text-ink-muted">
                Category
              </label>
              <select
                id="category"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as FindingCategory })}
                className={cn(field, "mt-1")}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label htmlFor="confidence" className="text-xs text-ink-muted">
                Confidence
              </label>
              <select
                id="confidence"
                value={draft.confidence}
                onChange={(e) => setDraft({ ...draft, confidence: e.target.value as Finding["confidence"] })}
                className={cn(field, "mt-1")}
              >
                {["high", "medium", "low"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {(["severity", "actionability", "evidenceStrength"] as const).map((key) => (
              <div key={key}>
                <label htmlFor={key} className="text-xs text-ink-muted">
                  {key === "evidenceStrength" ? "Evidence (1–5)" : `${key[0].toUpperCase()}${key.slice(1)} (1–5)`}
                </label>
                <input
                  id={key}
                  type="number"
                  min={1}
                  max={5}
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })}
                  className={cn(field, "mt-1 tabular")}
                />
              </div>
            ))}
          </div>
          <fieldset>
            <legend className="text-xs text-ink-muted">Mission relevance (0–3)</legend>
            <div className="mt-1 grid grid-cols-5 gap-2">
              {MISSIONS.map((m) => (
                <label key={m.key} className="text-2xs text-ink-muted">
                  {m.label}
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={draft.missionRelevance[m.key]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        missionRelevance: {
                          ...draft.missionRelevance,
                          [m.key]: Math.min(3, Math.max(0, Number(e.target.value) || 0)),
                        },
                      })
                    }
                    className={cn(field, "mt-1 px-2 tabular")}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => submit("verify")} disabled={busy} className="bg-ok text-canvas hover:bg-ok/85">
              <Check /> Verify <kbd className="ml-1 opacity-70">V</kbd>
            </Button>
            <Button variant="secondary" onClick={() => submit("edit-verify")} disabled={busy}>
              <PencilLine /> Edit & verify <kbd className="ml-1 opacity-70">E</kbd>
            </Button>
            <Button variant="destructive" onClick={() => submit("reject")} disabled={busy}>
              <X /> Reject <kbd className="ml-1 opacity-70">R</kbd>
            </Button>
            {current.finding.status !== "ai-draft" ? (
              <Button variant="ghost" onClick={() => submit("reset")} disabled={busy}>
                <RotateCcw /> Reset to draft
              </Button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
