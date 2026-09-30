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

## Phase 9 — AI copilot, summaries, methods · ✅ (2026-09-30)
- Provider: the human supplied a Groq key (stored only in `.env.local`, gitignored). `AI_PROVIDER=groq`, default model
  `openai/gpt-oss-120b` (free tier, `reasoningEffort: "low"`). `src/lib/ai/provider.ts` also switches to Google, OpenAI or
  Anthropic; no provider or no key → offline mode. Keys are read server-side only; the client gets a boolean.
- Answer engine `src/lib/ai/answer.ts`: hybrid retrieval (top 8) → relevance gate → streamed answer with `[[S#]]`
  aliases → server-side citation check. Offline: saved answer when the question matches (exact or cosine ≥ 0.8),
  otherwise the most relevant passages verbatim. Provider failure (e.g. Groq's 8k tokens/min limit) falls back offline.
- `/api/ask` streams NDJSON (meta → deltas → done with invalid / flagged / used citations); `/api/summarize` serves the
  saved mission digest or a fresh one (`fresh=1`). In-memory rate limit applies only when a model is connected.
- `/ask`: composer, 12 suggested questions (tagged by mission), streaming answer with citation chips → SourceDrawer,
  mode badge (AI / offline saved / offline passages / outside the evidence), confidence, sources used, flagged-citation
  notice, copy answer, session history, "how answers are made" rail. Mini-ask: the floating sheet and ⌘K now stream the
  answer in place. Mission Control's digest tile shows the saved AI digest (6 top-ranked findings, every sentence cited),
  with "Write a fresh digest" when a model is connected and the plain-language fallback when nothing is saved.
- `scripts/ts/precompute-answers.ts` → `precomputed-answers.json`: 12 suggested answers, 5 mission digests, 5 verified
  refusals; every citation checked against `chunks.json`. `validate-data.ts` now also checks that every `[[S#]]` resolves,
  sources match and excerpts are verbatim.
- `/methods` (research-paper style, every number computed from the data at build): summary, sources, 4-stage pipeline,
  findings protocol, test points with unit conversions and outcome mappings, insight score, coverage metric, copilot,
  limitations (incl. ML estimate not attempted), PowerShell reproduction, use of AI, glossary with `#term-<id>` anchors,
  references (133 sources, grouped, linked) + PSI acknowledgement. `/about`: challenge, summarize/rank/interpret map,
  team placeholder (`src/content/about.ts`, the human fills names), credits, disclaimer.
- Decision: relevance gate at cosine 0.48, calibrated on 15 questions (in-scope 0.524–0.763, out-of-scope 0.165–0.451).
- Decision: gpt-oss writes citations as `【S1】`; `normalizeAnswer` maps every variant (`【S1†L3】`, `[S1]`) to `[[S1]]`
  instead of relying on the prompt alone (the prompt also asks for `[[S#]]`).
- Decision: e2e runs the server with `AI_PROVIDER=offline` (real env overrides `.env.local`), so tests are deterministic,
  spend no quota and cover the no-key demo path.
- Spot check: the digest's "26.5–34% O2 exploration atmospheres" traces to PSI-20 ("10.2 psia, 26.5 %; and 8.2 psia, 34 %").
- **Checkpoint:** with the key disabled (`AI_PROVIDER=offline` production server) 19/19 checks: 12 suggested questions →
  saved answers, all citations resolve to real chunks with matching sources, 0 invalid; 2 paraphrases → cited passages;
  5 out-of-scope (World Cup, cake, boiling point on Mars, Starship date, taxes) refused with no citations (max cosine
  0.171–0.451). Live mode verified with Groq in dev (cited, high-confidence answers; digest in 1.3 s). Unit tests 28/28
  (+7 citation tests); e2e 62/62 incl. `e2e/ask.spec.ts` (desktop + mobile). Screenshots `qa/ask-*.png`,
  `qa/methods-*.png`, `qa/about-desktop.png`, `qa/mini-ask.png`, `qa/dashboard-digest.png`.

## Phase 10 — Polish · ✅ (2026-09-30)
- Audit (redesign-existing-projects, then gpt-taste as a critique lens) of every page at 1440 and 375 px; before/after
  screenshots in `qa/phase10/before/` and `qa/phase10/after/` (11 routes × desktop + mobile). High-priority fixes:
  - `/compare` was a placeholder that detail pages and the footer linked to: built it (NICE, done). Picker (search
    popover, removable A/B/C chips, `?ids=` in the URL), aligned condition-range bars on shared axes (log for pressure and
    flow), an at-a-glance table (platform, facility, years, fuels, diluents, test-point outcomes, findings, sources, PSI
    data), strongest-evidence findings with citation chips, empty state with three ready-made comparisons.
  - Mission Control bento: the Top 5 card spanned two rows and left ~250 px of dead space; re-paired cards by height
    (Top 5 | digest, coverage | categories, timeline full width). Zero-count category rows now show "0".
  - Plurals ("1 findings" → "1 finding") on explorer cards, detail header and heatmap tooltip.
  - Meta: branded `icon.svg` (replaced the default Next.js favicon), generated `apple-icon`, `opengraph-image` (Instrument
    Serif bundled under OFL, counts from the dataset), `robots.ts` (dev routes and API disallowed), `sitemap.ts`; titles
    no longer use em-dashes.
  - Micro-interactions: opacity-only page transition on client navigations (`template.tsx`, skipped on first load so LCP
    is untouched), smooth anchor scrolling (`data-scroll-behavior="smooth"`, off under reduced motion), balanced
    headings (`text-balance`) and pretty wrapping on lead paragraphs. /about lost its "01/02/03" meta numbering.
- Mobile: overflow sweep with `clientWidth` at 375 and 340 px on all routes → none (the first sweep compared against
  `innerWidth` and missed a 12 px overflow on /compare, fixed with `grid-cols-1`).
- Code health: all 21 React-compiler lint errors cleared (state synced during render instead of in effects,
  `useSyncExternalStore` for client-only flags and localStorage, seeded PRNG for the flame embers, stable `createRef`s);
  4 unused Magic UI components removed. `npm run lint` clean.
- `/api/ask`: the stream stops reading the model and writing when the client disconnects (was logging "Controller is
  already closed").
- Decision: `/compare` shows condition coverage as aligned range bars rather than a radar (§7.10 suggests a radar):
  ranges on shared axes are exact and readable; identity colours validated with the dataviz script (violet / teal /
  gold, all-pairs CVD ΔE ≥ 13.4, never blue/orange which mean micro/Earth gravity) and always paired with A–C letters.
- Decision: links to `/compare?ids=…` use `prefetch={false}`: Next 16 kept those prefetch requests (a page that awaits
  `searchParams`) open indefinitely, which blocked network idle.
- **Checkpoint:** unit 34/34 (+6 compare tests), e2e 60/60 (+8 `e2e/compare.spec.ts`), typecheck + lint clean, console
  sweep (13 routes × normal / reduced motion) 0 errors, before/after screenshots saved.

## Session 2 — resume (2026-09-30, 17:30 Asia/Dhaka)
Checked the real state, not just this log: git (11 phase commits up to `d2fe8d7 Phase 11 QA`, plus uncommitted
security-review / simplify fixes and a shareable-image route), routes, scripts, data, and a full test run.
Data: 133 sources · 29 experiments · 44 findings (44 `ai-draft`, 0 verified, 0 rejected) across 20 investigations ·
472 measurements (156 burned / 311 self-extinguished / 5 no-ignition) · 3,404 chunks · 31 glossary terms · 22 saved answers.
Checks: typecheck ✅ · lint ✅ · unit 34/34 ✅ · data:validate ✅ · `npm run build` ✅ · Playwright 120 passed,
20 skipped by design (tablet sweep runs on the desktop project only), 0 failed.

| Phase / §7 item | Status | Missing |
|---|---|---|
| 1 Scaffold | done | none |
| 2 Data collection | done | none (PSI login was not needed: public API) |
| 3 Processing & knowledge base | done | 0/44 findings human-verified (team task in `/review`); STRETCH ML model not attempted |
| 4 Design system | done | none |
| 5 Landing + 3D flame | done | none |
| 6 Mission Control | done | none |
| 7 Explorer & detail | done | none |
| 8 Insights + Risk Lens | done | NICE mission brief PDF done (print stylesheet) |
| 9 AI copilot, summaries, methods | done | none (Groq key in `.env.local`, offline mode tested) |
| 10 Polish | done | NICE `/compare` done |
| 11 STRETCH list (project.md numbering) | partial | shareable insight images built but uncommitted; ML estimate, light theme, bn toggle, scenario cards not started |
| 12 Local QA & demo-ready (the prompt's "Phase 11") | partial | axe + tablet/motion specs done; Lighthouse run once (simulated: dashboard/lens 85, 4 pages 88–89, below the 90 target); security/simplify fixes uncommitted; code-review not logged; route × breakpoint × motion screenshots, offline demo walk, README final pass and final report missing |
| Shell (nav, mission switcher, ⌘K, Ask button, footer, mobile sheet) | done | none |
| 7.1 Landing | done | step copy uses AI-draft findings (badged) because none are verified yet |
| 7.2 Dashboard | done | none |
| 7.3 Explorer | done | none |
| 7.4 Detail | done | none |
| 7.5 Insights | done | none |
| 7.6 Risk Lens | done | (6) ML estimate is STRETCH, not built |
| 7.7 Ask the Flame | done | none |
| 7.8 Methods | done | none |
| 7.9 About | done | team names are placeholders for the human |
| §8 3D flame | done | none |

- Decision: project.md now numbers the STRETCH list as Phase 11 and local QA as Phase 12. The prompt's "Phase 11 final
  report" is written as the Phase 12 QA report, and STRETCH work only starts once Phase 12 is green.
- Decision: stale `next dev` (3000) and `next start` (3100) servers from the last session were stopped so e2e runs on a
  fresh build instead of reusing an old server.
