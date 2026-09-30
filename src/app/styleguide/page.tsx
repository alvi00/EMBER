import type { Metadata } from "next";
import { ArrowRight, Search } from "lucide-react";
import { assertDevOnly } from "@/lib/dev-only";
import { MISSIONS } from "@/lib/missions";
import { findings } from "@/lib/data";
import { Bezel } from "@/components/ember/Bezel";
import { CtaLink } from "@/components/ember/CtaLink";
import { CitationChip } from "@/components/ember/CitationChip";
import { MissionChip } from "@/components/ember/MissionChip";
import {
  CATEGORY_META,
  CategoryBadge,
  ConfidenceBadge,
  OutcomeBadge,
  SeverityMeter,
  StatusBadge,
} from "@/components/ember/badges";
import {
  DropletFlameGlyph,
  GasJetFlameGlyph,
  SheetFlameGlyph,
  SmokeGlyph,
  SuppressionGlyph,
} from "@/components/ember/glyphs";
import { EmptyState, ErrorNotice, SkeletonLines } from "@/components/ember/states";
import { Button } from "@/components/ui/button";
import { Ticker } from "@/components/ember/Ticker";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShineBorder } from "@/components/magicui/shine-border";
import type { FindingCategory } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const COLORS = [
  { name: "--bg", value: "#05060A", use: "Page", cls: "bg-canvas" },
  { name: "--bg-elev-1", value: "#0B0D14", use: "Cards", cls: "bg-elev-1" },
  { name: "--bg-elev-2", value: "#11141D", use: "Popovers, drawers", cls: "bg-elev-2" },
  { name: "--text", value: "#E8EAF0", use: "Primary text", cls: "bg-ink" },
  { name: "--text-muted", value: "#8A90A2", use: "Secondary text", cls: "bg-ink-muted" },
  { name: "--flame-micro", value: "#4CC9F0", use: "Microgravity, cool, blue flame", cls: "bg-flame-micro" },
  { name: "--flame-violet", value: "#7B61FF", use: "Transitions, AI accents", cls: "bg-flame-violet" },
  { name: "--flame-earth", value: "#FF7A18", use: "1 g flame, warnings", cls: "bg-flame-earth" },
  { name: "--flame-core", value: "#FFD166", use: "Key numbers", cls: "bg-flame-core" },
  { name: "--danger", value: "#FF4D4F", use: "High severity", cls: "bg-danger" },
  { name: "--ok", value: "#3DDC97", use: "Extinguished, safe outcome", cls: "bg-ok" },
  { name: "--unknown", value: "#5B6275", use: "No data (always hatched)", cls: "hatch bg-elev-2" },
];

const TYPE = [
  { size: "112", cls: "font-display text-[7rem] leading-[0.92]", sample: "Freefall" },
  { size: "72", cls: "font-display text-7xl leading-none", sample: "In space, fire has nowhere to go" },
  { size: "48", cls: "font-display text-5xl leading-tight", sample: "Mission Control" },
  { size: "32", cls: "text-[2rem] leading-tight font-medium", sample: "Ranked insights for the Moon" },
  { size: "24", cls: "text-2xl font-medium", sample: "Habitat Risk Lens" },
  { size: "18", cls: "text-lg", sample: "Flames quench when the airflow falls to 1-5 cm/s." },
  { size: "16", cls: "text-base text-ink-muted", sample: "Body copy sits at 16 px with relaxed leading." },
  { size: "14", cls: "text-sm text-ink-muted", sample: "Secondary UI copy and table cells." },
  { size: "12", cls: "font-mono text-xs text-ink-muted tabular", sample: "PSI-25 · 101.3 kPa · 22.0% O2 · 0.17 g" },
];

export default function StyleguidePage() {
  assertDevOnly();
  const sample = findings[0];
  const ev = sample?.evidence[0];
  return (
    <div className="container-ember space-y-20 py-12">
      <header>
        <p className="eyebrow">Dev only</p>
        <h1 className="font-display mt-3 text-6xl leading-tight">Styleguide</h1>
        <p className="text-ink-muted mt-3 max-w-2xl">
          Deep space, living flame. Blue means microgravity and cool; amber-orange means Earth gravity, soot and danger.
          Meaning is never carried by colour alone.
        </p>
      </header>

      <section aria-labelledby="sg-colors">
        <h2 id="sg-colors" className="text-2xl font-medium">
          Colour tokens
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {COLORS.map((c) => (
            <li key={c.name} className="surface overflow-hidden">
              <div className={`border-line h-20 border-b ${c.cls}`} />
              <div className="p-3">
                <p className="text-ink font-mono text-xs">{c.name}</p>
                <p className="text-2xs text-ink-muted font-mono">{c.value}</p>
                <p className="text-ink-muted mt-1 text-xs">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>
        <div
          role="img"
          className="mt-4 h-3 rounded-full [background:var(--flame-gradient)]"
          aria-label="Flame gradient"
        />
      </section>

      <section aria-labelledby="sg-type">
        <h2 id="sg-type" className="text-2xl font-medium">
          Type scale
        </h2>
        <p className="text-ink-muted mt-2 text-sm">
          Display: Instrument Serif (italic for emotive words). UI: Geist Sans. Data: Geist Mono with tabular figures.
        </p>
        <ul className="mt-6 space-y-5">
          {TYPE.map((t) => (
            <li key={t.size} className="grid grid-cols-[3rem_1fr] items-baseline gap-4 overflow-hidden">
              <span className="text-ink-faint font-mono text-xs">{t.size}</span>
              <span className={`truncate ${t.cls}`}>{t.sample}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sg-buttons">
        <h2 id="sg-buttons" className="text-2xl font-medium">
          Buttons & focus
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <CtaLink href="/dashboard">Open Mission Control</CtaLink>
          <CtaLink href="/ask" variant="ghost" icon={ArrowRight}>
            Ask the Flame
          </CtaLink>
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">
            <Search strokeWidth={1.5} /> Ghost
          </Button>
          <Button variant="destructive">Reject</Button>
        </div>
        <p className="text-ink-muted mt-4 text-sm">
          Keyboard focus shows a 2 px flame-micro outline with 2 px offset on every interactive element. Tab through
          this row to check.
        </p>
      </section>

      <section aria-labelledby="sg-badges">
        <h2 id="sg-badges" className="text-2xl font-medium">
          Badges
        </h2>
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status="verified" reviewer="Reviewer" />
            <StatusBadge status="ai-draft" />
            <StatusBadge status="rejected" />
          </div>
          <div className="flex flex-wrap gap-2">
            <ConfidenceBadge confidence="high" />
            <ConfidenceBadge confidence="medium" />
            <ConfidenceBadge confidence="low" />
          </div>
          <div className="flex flex-wrap gap-6">
            {[1, 2, 3, 4, 5].map((v) => (
              <SeverityMeter key={v} value={v} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_META) as FindingCategory[]).map((c) => (
              <CategoryBadge key={c} category={c} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {["burned", "self-extinguished", "no-ignition", "extinguished-by-agent"].map((o) => (
              <OutcomeBadge key={o} outcome={o} />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="sg-chips">
        <h2 id="sg-chips" className="text-2xl font-medium">
          Citation & mission chips
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {ev ? <CitationChip sourceId={ev.sourceId} chunkId={ev.chunkId} page={ev.page} excerpt={ev.excerpt} /> : null}
          {ev ? (
            <CitationChip sourceId={ev.sourceId} chunkId={ev.chunkId} page={ev.page} excerpt={ev.excerpt} index={1} />
          ) : null}
          {MISSIONS.map((m, i) => (
            <MissionChip key={m.id} mission={m} active={i === 2} />
          ))}
        </div>
      </section>

      <section aria-labelledby="sg-glyphs">
        <h2 id="sg-glyphs" className="text-2xl font-medium">
          Glyphs
        </h2>
        <ul className="text-ink mt-6 flex flex-wrap gap-6">
          {[
            { C: DropletFlameGlyph, label: "Droplet flame" },
            { C: SheetFlameGlyph, label: "Solid-sheet flame" },
            { C: GasJetFlameGlyph, label: "Gas-jet flame" },
            { C: SmokeGlyph, label: "Smoke" },
            { C: SuppressionGlyph, label: "Suppression" },
          ].map(({ C, label }) => (
            <li key={label} className="flex flex-col items-center gap-2">
              <span className="surface flex size-16 items-center justify-center">
                <C className="size-7" />
              </span>
              <span className="text-ink-muted text-xs">{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sg-cards" className="grid gap-6 md:grid-cols-3">
        <h2 id="sg-cards" className="sr-only">
          Cards
        </h2>
        <div className="surface p-6">
          <p className="text-ink-muted text-sm">Surface card</p>
          <p className="tabular mt-2 text-3xl font-medium">
            <Ticker value={findings.length} className="text-flame-core" />
          </p>
          <p className="text-ink-muted mt-1 text-sm">findings (Magic UI NumberTicker, runs once)</p>
        </div>
        <Bezel innerClassName="p-6">
          <p className="text-ink-muted text-sm">Double-bezel card</p>
          <p className="mt-2 text-lg">Hero panels and key tiles.</p>
        </Bezel>
        <div className="surface relative overflow-hidden p-6">
          <BorderBeam size={80} duration={8} colorFrom="#4CC9F0" colorTo="#7B61FF" />
          <p className="text-ink-muted text-sm">Selected card</p>
          <p className="mt-2 text-lg">BorderBeam marks the selected insight.</p>
        </div>
        <div className="border-line relative overflow-hidden rounded-full border px-6 py-3 text-sm md:col-span-3 md:w-max">
          <ShineBorder shineColor={["#4CC9F0", "#7B61FF", "#FF7A18"]} borderWidth={1} />
          ShineBorder is reserved for the primary CTA only.
        </div>
      </section>

      <section aria-labelledby="sg-states" className="grid gap-6 md:grid-cols-3">
        <h2 id="sg-states" className="sr-only">
          States
        </h2>
        <EmptyState
          title="No experiments match these filters"
          body="Try widening the oxygen range or clearing the platform filter."
          action={{ href: "/experiments", label: "Clear all filters" }}
        />
        <div className="surface p-6">
          <p className="text-ink-muted mb-4 text-sm">Loading</p>
          <SkeletonLines lines={4} />
        </div>
        <ErrorNotice
          title="The AI provider did not respond."
          body="Showing retrieval-only results from the dataset instead."
        />
      </section>
    </div>
  );
}
