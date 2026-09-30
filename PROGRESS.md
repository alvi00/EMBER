# EMBER — Build progress

Scope: website only, local (project.md revised 2026-09-29). No deploy, no push, no calendar/docs/slides/video.

## Phase 0 — Setup · ✅
- 2026-09-29: project.md replaced with the revised version. CLAUDE.md rewritten for the new scope
  (local-only, dropped Calendar/Docs/Drive/Canva/Vercel/GitHub, priority tiers). PROGRESS.md recreated
  (the earlier copies were not present in the repo folder).
- Environment: Node 22.20.0, npm 10.9.3, Python 3.11.9, git 2.51, Playwright Chromium present. Windows 11.

## Decisions log
- Findings extraction (§10.4): Claude Code drafts findings directly from chunks as `ai-draft` (allowed by §10.4), so
  Phase 3 does not depend on an API key.

## Phase 1 — Scaffold · ✅ (2026-09-30)
- Next.js 16.3.7 (App Router, Turbopack, TS strict, `src/`), Tailwind v4.3, React 19.2. shadcn/ui 4.21 initialised
  with **Radix** base (`-b radix`, style radix-nova) + 22 components. All deps from §4 installed and pinned to exact versions.
- Tokens (`src/styles/tokens.css`) mapped into Tailwind `@theme` (`bg-canvas`, `bg-elev-1/2/3`, `text-ink(-muted)`,
  `flame-micro/violet/earth/core`, `danger/ok/unknown`, `.surface`, `.hatch`, film grain). Fonts via `next/font`:
  Geist Sans, Geist Mono, Instrument Serif (normal + italic).
- Shell: sticky header (desktop nav with active gradient hairline, bottom-sheet nav on mobile), footer with provenance
  + disclaimer, skip link. Routes: `/`, `/dashboard`, `/experiments`, `/experiments/[id]`, `/insights`, `/lens`, `/ask`,
  `/compare`, `/methods`, `/about`, `/review`, `/styleguide`, plus `not-found`, `error`, `loading`.
- `.env.example`, `.gitignore` (data/raw, .env*, qa/), local `git init` (no remote).
- **Checkpoint:** `npm run build` ✅ · Playwright `e2e/routes.spec.ts` 24/24 ✅ (9 routes × 2 viewports: 200 + 0 console
  errors; dev-only routes 404 in prod; custom 404) · screenshots `qa/phase1/shell-dashboard-{375,768,1440}.png` reviewed.
- Decision: dev-only routes are blocked by `src/proxy.ts` (Next 16's renamed middleware) because the root `loading.tsx`
  Suspense boundary makes an in-page `notFound()` stream with status 200.
- Decision: Vitest resolves `@/` with a plain `resolve.alias` instead of adding vite-tsconfig-paths.

## Phase 2 — Data collection · ✅ (2026-09-30)
- **PSI login not needed.** `psi.nasa.gov` now redirects to NASA BPS Data; the PSI repository
  (`psi.nasa.gov/physci/repo`) exposes a public JSON API (`/geode-py/ws/repo/search`, `/repo/investigations/<PSI-n>`)
  and every combustion file is `restricted: false`, so downloads work anonymously through signed S3 links. I did not
  stop to ask for a login (§11 Phase 2 fallback: "rely on public PSI pages + NTRS").
- Playwright MCP browser was used for all discovery: PSI search → 24 Combustion Science investigations (19 flight,
  5 ground) with full metadata (objectives, approach, hypothesis, impacts, DOI, CC0-1.0 licence, publications, file
  lists); NTRS public API (`/api/citations/search`, 25 queries → 114 candidates → 41 selected); science.nasa.gov explainer.
  Byte downloads of the resolved PSI/NTRS URLs were done with Python urllib (signed URLs expire in ~1 h).
- Downloaded: 22 PSI experimental tables (CSV), 10 analysed-data CSV/XLSX, 45 PSI reports / science docs /
  presentations, 41 NTRS PDFs, 1 NASA web page. 6 PSI files return 404 on every version (SAFFIRE-III ICES
  presentations ×3, BASS-II test-matrix xlsx + ReadMe, BASS final report) — recorded as not retrievable.
- Registry: `data/sources.json` (133 sources) and `data/processed/experiments.json` (29 experiments: 19 PSI flight,
  5 PSI ground re-analyses, plus Saffire IV–VI, Confined Combustion, LUCI, partial-g centrifuge tests and SoFIE from NTRS).
  All `verified: false`. Condition ranges computed from PSI experimental tables where possible (unit conversions:
  mmHg×0.133322, atm×101.325, bar×100, psia×6.894757 → kPa; mole fraction×100 → %).
- Data-quality notes: PSI lists SAFFIRE-I dates as 2001–2008 and platform ISS (copied from SAME); corrected to Cygnus /
  2016 from NTRS 20170000230 with a `yearsNote`. SPICE year (2009) from its final report; CFI-G/SLICE years from test
  codes/dates in their tables. Saffire VI flight date is not stated in any collected source → left unstated.
  SAFFIRE-I/III SIBAL thickness units are inconsistent across PSI tables → kept as raw notes, not converted.
- **Checkpoint:** `npm run data:validate` ✅ (133 sources, 29 experiments, every experiment ≥ 1 source, all ids resolve).
  Manifest: `data/raw-manifest.md` (119 files, 295.7 MB).

## Phase 3 — Processing & knowledge base · ✅ (2026-09-30)
- `extract_pdf.py` (PyMuPDF — pdfplumber was not installed and PyMuPDF was): 88 text sources → **3,404 chunks**
  (~350 tokens, 60 overlap, never crossing a page, page numbers kept; PSI investigation metadata and the NASA web page
  are page-less chunks).
- `clean_tables.py` + `build_measurements.py`: **472 measurement rows** — FLEX droplets (274), ACME CFI-G (133), partial-g
  limits Table I (24), BASS-II SIBAL appendix (18), Saffire-II µg + 1 g reference (14), Saffire IV–VI Table 1 (7), Saffire-I (2).
  Outcome mappings and unit conversions are documented in the scripts (and will be listed on /methods). Spreadsheet error
  cells / "none" / 0-pressure placeholders are treated as missing. Reused BASS-II samples and one ambiguous row split by a
  page break are excluded.
- Findings: no AI key at build time → drafted by Claude Code from the chunks (§10.4 option) in
  `data/curation/findings.draft.json`; `extract-findings.ts` resolves every excerpt to a chunk id + page and rejects
  anything not verbatim or > 25 words. **44 findings across 20 investigations, all `ai-draft`, 0 rejected.**
  Re-running preserves human decisions (verified / rejected / reviewer).
- `/review` (dev-only) is ready: source chunk with highlighted excerpt ← → editable fields, Verify / Edit & verify /
  Reject, shortcuts V/E/R/J/K, writes `findings.json` via dev-only `/api/review`. **Ready for the team to verify in
  parallel.** Screenshot `qa/phase3/review-1440.png`.
- Embeddings: `Xenova/all-MiniLM-L6-v2` (q8) over all chunks → int8-quantised `embeddings.json` (1.92 MB, model cached in
  `models-cache/` for offline query embedding). BM25: MiniSearch `search-index.json` (3.49 MB).
- `glossary.json`: 31 terms written in our own words.
- STRETCH ML model (step 7): not attempted now — deferred to Phase 12 time permitting; will be stated on /methods.
- **Checkpoint:** `npm run data:validate` ✅ (133 sources, 29 experiments, 44 findings, 472 measurements, 3,404 chunks,
  31 glossary terms). Spot-check of 3 random findings (f-flex-01, f-saffire-iv-vi-04, f-acme-bre-01) against their source
  pages: all statements supported, derived numbers (0.22→0.30 O2, 1000→544 mbar) match Table 1.

## Phase 4 — Design system · ✅ (2026-09-30)
- Loaded **design-taste-frontend** + **high-end-visual-design**. Design read: evidence-first science web app for judges,
  mission planners and researchers; deep-space dark-tech editorial language (restrained "ethereal glass"), Tailwind v4 +
  customised shadcn/ui. Dials: landing 8/7/3, data pages 5/4/6. project.md explicitly names Instrument Serif and
  lucide-react (1.5 stroke), so those override the skills' defaults. Adopted from the skills: floating glass nav island,
  double-bezel cards for key tiles, pill CTAs with nested trailing icon, custom cubic-bezier motion, no em-dashes in UI copy.
- Magic UI (via **magicui MCP** → shadcn CLI) into `src/components/magicui/`: Particles, NumberTicker, BentoGrid, BorderBeam,
  AnimatedBeam, Marquee, TextAnimate, BlurFade, ShineBorder, AnimatedGridPattern (duplicate button.tsx removed).
- EMBER primitives `src/components/ember/`: StatusBadge (verified / AI draft / rejected), ConfidenceBadge, SeverityMeter,
  CategoryBadge, OutcomeBadge, CitationChip, MissionChip, Bezel, CtaLink, EmptyState/ErrorNotice/SkeletonLines, Reveal,
  Ticker (SSR real value → NumberTicker), custom glyphs (droplet / sheet / gas-jet flame, smoke, suppression).
- Shell: floating nav island with motion `layoutId` active pill, ⌘K CommandPalette (pages, 29 experiments, 44 findings,
  31 glossary terms, "Ask the Flame: …"), MissionSwitcher (`?mission=` + persisted zustand store), global SourceDrawer
  (source provenance + cited chunk highlighted via `/api/chunk`, open original, copy link), floating Ask + mini-ask sheet,
  footer provenance line computed from data.
- `src/lib/missions.ts`: gravity per mission; cabin defaults sourced where NASA states them (ISS 101.3 kPa / ~22% O2 —
  NTRS 20205004657; Lunar 56.5 kPa / 34% O2 — NTRS 20260002050), others labelled "assumed".
- Decision: `--text-faint` raised from #6B7184 to #7A8094 (4.16:1 → 5.1:1 on --bg) after axe flagged it.
- **Checkpoint:** styleguide screenshots `qa/phase4/styleguide-{1440,768,375}.png` reviewed; axe (axe-core 4.x injected via
  Playwright) = **0 violations** after fixes; 0 console errors; `tsc --noEmit` clean.

## Phase 5 — Landing + 3D flame · ✅ (2026-09-30)
- `FlameScene` (R3F, context7-checked APIs): one additive billboard with an fBm fragment shader + 90 embers. `uGravity`
  0→1 interpolates shape (sphere → upward teardrop, larger/dimmer sphere at 0 g), colour ramp (flame-micro/violet →
  white-yellow core, orange, sooty tip, blue base), luminosity and flicker rate; embers rise only when g > 0.
  `dpr=[1,1.75]`, `frameloop` paused off-screen (IntersectionObserver), dynamic import `ssr:false`.
- Decision: "subtle bloom" is an in-shader additive halo instead of @react-three/postprocessing EffectComposer (cheaper,
  keeps the landing Performance budget). One/One custom blending so the transparent canvas composites correctly.
- Fallbacks: static posters `public/flame/poster-{space,moon,mars,earth}.webp` rendered from the live scene with
  Playwright; used for reduced motion, no WebGL, or low-power devices (≤2 cores / ≤2 GB / save-data). The gravity slider
  still switches posters.
- Accessibility: canvas `aria-hidden`; real `<input type="range">` with `aria-valuetext` ("Moon, 0.17 g") and preset
  buttons evenly spaced (piecewise-linear mapping); "Artistic visualization… not a simulation" label.
- Landing (§7.1): hero (2-line headline, ShineBorder primary CTA + Ask), sticky flame through three GSAP ScrollTrigger
  scenes that scrub `uGravity` Earth → orbit → Moon (holding while each step is read; snap-per-step with reduced motion);
  step copy from findings/NASA text with CitationChips + AI-draft badge; archive section (Magic UI Marquee of 29 acronyms +
  Tickers computed from data); "How EMBER works" AnimatedBeam pipeline with real counts; mission cards (relevant-finding
  counts + sourced/assumed cabin); final CTA. Section headlines use GSAP SplitText line reveals (gsap MCP + context7 docs).
- Decisions: hero entrance is CSS (runs at first paint) rather than JS SplitText, so LCP text is never held back by
  hydration; SplitText used on section headlines instead. `Reveal` rebuilt as CSS + IntersectionObserver to remove a
  reduced-motion hydration mismatch; AnimatedBeams render after mount only. SplitHeading sets its text as HTML so React
  never reconciles nodes SplitText rewrites (fixed a `removeChild` error). `/review` file access scoped to `data/`.
- **Checkpoint:** scroll screenshots `qa/phase5/scroll-{1..7}*.png`; reduced-motion `qa/phase5/reduced-motion-hero.png`
  (poster, no canvas); mobile `qa/phase5/mobile-375-*.png`. Production build: CLS **0.00008**, **0 long tasks** during load
  and a full scroll (rAF frame timing is throttled to 1 fps in the background automation tab, so FPS was not measurable
  here). Route e2e 24/24 ✅ on the production server.
