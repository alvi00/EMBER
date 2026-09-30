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

## Phase 6 — Mission Control · ✅ (2026-09-30)
- Loaded **stitch-design-taste** + **dataviz**. Dashboard tiles use sans only (Geist / Geist Mono); display serif stays in
  the page header. Chart palette computed with the dataviz validator (dark mode vs --bg-elev-1): brand tones failed the
  dark lightness band, so charts use stepped tokens `--viz-micro #2F9BC8`, `--viz-earth #D95926`, `--viz-partial #C98500`
  (blue/orange ΔE 21.7, blue/amber ΔE 21.4 — all checks pass; amber and orange never share a chart), neutral + hatch for
  ground/no-data, single-hue sequential ramp for counts.
- `src/lib/scoring.ts` implemented now (needed for Top 5) with 10 Vitest tests (ordering, weight normalisation,
  all-zero/invalid weights → defaults, AI-draft × 0.7, rejected excluded, mission re-rank, deterministic ties): all pass.
- Mission Control (Magic UI BentoGrid, re-themed): KPI row (Tickers), Top 5 insights (score, category, status, source
  chip), evidence digest (offline, assembled from top-ranked findings with citations — replaced by AI digest in Phase 9),
  coverage mini-heatmap gravity × O2 (hatched = no data, ring = mission cabin, → /lens), experiment timeline by platform
  (D3 scales + SVG, regime colour, hatched ground rows, open-ended bars flagged, hover/focus tooltips, links to detail),
  findings-by-category bars (Recharts, single series, direct labels, sr-only table). Layout-matching skeleton.
- Copy sweep: em-dashes/en-dashes removed from all authored UI text (findings statements/plain language/implications,
  glossary, curated experiment copy, mission notes); verbatim evidence excerpts untouched. Findings re-extracted: 44 ✅.
- Fix: heatmap header used an `sr-only` cell that dropped out of the grid (row labels shifted); replaced with a visible
  "O2" corner cell.
- **Checkpoint:** screenshots `qa/phase6/dashboard-{1440,768,375}.png`; mission switch ISS → Mars surface updates URL,
  KPIs, Top 5 ids, cabin cell ("Mars, O2 ≥30%: no data"), category data; keyboard traversal: 60 tab stops all visible,
  timeline bars show a focus stroke + tooltip (`qa/phase6/timeline-focus.png`); 0 console errors; no horizontal overflow at 375.

## Phase 7 — Explorer & detail · ✅ (2026-09-30)
- Loaded **minimalist-ui** (calm hairline tables, crisp radii, small uppercase-free tags; dark tokens kept).
- `src/lib/search.ts`: hybrid retrieval (MiniSearch BM25 top-20 ∪ embedding cosine top-20 → reciprocal-rank fusion,
  k = 60), query embeddings via transformers.js in the Node route (model cached in `models-cache/`), graceful BM25-only
  fallback. `/api/search` aggregates passage hits to experiments. This is also the retrieval core for Phase 9.
- `/experiments`: filter rail (category, platform, fuel group, facility group, year / O2 / pressure / flow range sliders,
  has-raw-data, verified-only), mobile filter drawer, cards/table toggle, sortable table with sticky header, hybrid search
  (client MiniSearch over experiment fields + top-8 semantic experiments from source passages, RRF) with highlighted
  matches and "from a source" snippets; all state in the URL; optimistic local state so controls respond instantly.
- `/experiments/[id]` (29 static params, unknown ids → 404): header (platform, facility, years, PSI link, DOI), actions
  (Ask about this experiment, Compare with…), URL-synced tabs: Summary (plain language, why it matters, NASA objectives,
  facts incl. `yearsNote`), Findings (FindingCard: badges, statement, evidence quotes + chips, mission-relevance dots,
  severity/actionability/evidence meters), Conditions (range table + notes + source chips, outcome test-matrix scatter
  with colour + shape), Data (measurement table + client-side CSV export), Sources (all sources, original links).
- Decisions: `/experiments` and `/dashboard` render per request (`force-dynamic`) so URL state is server-rendered instead
  of bailing out to client rendering; optimistic mission value shared through the zustand store (pending until the URL
  catches up). Evidence keys include the index (two excerpts can share a chunk).
- Data fix: FLEX pressure range excluded 0-mmHg "not recorded" placeholders (was 0-309.3 → now 70.2-309.3 kPa).
- **Checkpoint:** `e2e/explorer.spec.ts` 6/6 ✅ (desktop + mobile: filter → table → reload restores → open BASS-II →
  Findings tab → citation opens SourceDrawer with highlighted passage + NASA link → reload restores tab; search in URL with
  highlights; unknown id 404). Screenshots `qa/phase7/*.png` (1440 / 768 / 375). 0 console errors.

## Phase 8 — Insights + Risk Lens · ✅ (2026-09-30)
- `/insights`: InsightCards (rank, score, category / status / confidence / experiment badges, statement, plain language,
  safety implication, all evidence chips), weight panel (4 sliders with % share, reset, visible formula), live re-rank
  with FLIP (motion `layout`, disabled under reduced motion), score-breakdown popover (stacked bar + per-factor points +
  AI-draft factor + formula; 4-colour set validated with the dataviz script, adjacent CVD ΔE ≥ 8.4), category and
  confidence filters, selected insight (#hash) marked with BorderBeam, weights/filters in the URL (`?w=35-30-20-15`).
  NICE done: "Export mission brief (PDF)" via a print stylesheet (browser print-to-PDF), no extra dependency.
- `src/lib/coverage.ts` (§9.6) + 11 Vitest cases: per-dimension normalisation over the dataset range (log for pressure,
  log1p for flow), weighted Euclidean over shared dimensions (missing ones skipped + reported), thresholds 0.05 / 0.15,
  gravity mismatch never "direct" + partial-gravity warning, k nearest ordering, empty scope.
- `/lens`: cabin inputs (gravity presets + custom, O2, pressure, flow, material family, geometry; defaults from the
  mission, sourced/assumed label, all in the URL), coverage verdict with distance + warnings, flammability map (O2 vs flow
  on a log axis, outcome by colour + shape, cabin crosshair), nearest 5 points (distance, other-gravity flag, outcome,
  source chip), evidence-gaps panel ("where future experiments are needed") with the per-family coverage heatmap, relevant
  insights, permanent disclaimer.
- **Checkpoint:** unit tests 21/21 ✅; `e2e/insights-lens.spec.ts` 12/12 ✅ (desktop + mobile): Lunar → Severity 0 /
  Actionability max → order changes, `w=0-30-20-100` in URL, mission switch re-ranks, breakdown popover; Lens verdicts for
  3 hand-picked cabins: ISS fabric 22% O2 / 101.3 kPa / 20 cm/s → Directly tested (d = 0.002, Saffire-II 2-5); lunar
  fabric 34% / 56.5 kPa → Near (d = 0.100) + partial-gravity warning; Mars fabric 34% / 30 kPa / 50 cm/s → Extrapolation
  (d = 0.300). Screenshots `qa/phase8/*.png`.
