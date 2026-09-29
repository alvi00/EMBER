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
