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
