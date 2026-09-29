# EMBER — Claude Code project instructions

EMBER (Exploration Microgravity Burn Evidence Resource) is a NASA Space Apps 2026 entry for
"Flame in Freefall". It is an evidence-first web app that **summarizes, ranks and interprets**
NASA microgravity combustion findings for fire safety on human missions.

`project.md` is the single source of truth. Read it before any non-trivial change.
Progress is logged in `PROGRESS.md` (one entry per phase + one line per notable decision).

## Scope (revised)
- **Website only, running locally.** `npm run dev` and `npm run build && npm start` are the end of scope.
- **Do not** deploy, push to GitHub, add a git remote, create calendar events, docs, slides or video.
  Local `git init` + local commits per phase are fine.
- Work phases 1 → 11 in order without waiting between phases. Priority tiers: MUST → NICE → STRETCH (§11).
  If a phase overruns, cut its NICE items. Never let a stretch goal break a must-have.
- Stop for the human only for: PSI login (Phase 2), AI key (Phase 9, else offline mode), or a hard blocker
  after trying two alternatives.

## Guardrails (non-negotiable, project.md §14)
1. **Never invent science.** No fabricated experiments, dates, values, outcomes or quotes. Unknown = "no data".
2. Every finding/measurement stores `sourceId` (+ page/chunk); the UI always links back to the source.
3. Claude drafts findings as `ai-draft` only — **never** sets `status: "verified"`.
4. Lens, ML estimate and copilot are research-exploration tools, not operational guidance, not NASA products.
5. Evidence excerpts ≤ 25 words and must be substrings of their chunk; don't re-host paywalled PDFs;
   no NASA insignia/logos as branding.
6. Keys only in `.env.local`; never committed, never sent to the client.
7. Complete code only — no `// ...rest`, no TODO placeholders in shipped paths.
8. Accessibility: keyboard-complete, visible focus, semantic HTML, color-independent meaning, reduced motion.
9. Call **context7** before the first use of any library API in a phase.
10. After any UI change, take a Playwright screenshot and look at it before marking the step done.
11. UI reads numbers from `data/processed/*` — never hard-code stats or fake records.

## Tools
- MCP: **context7** (library docs), **magicui** (approved components only, §6.6), **gsap** (timelines,
  ScrollTrigger, reduced motion), **playwright** (data collection browser + all visual QA / e2e / axe).
- Not used: Google Calendar, Claude Docs, Google Drive, Canva, Vercel, GitHub push, claude-in-chrome (not loading).
- Skills: full-output-enforcement (all code), design-taste-frontend + high-end-visual-design (primary aesthetic),
  stitch-design-taste, minimalist-ui, dataviz, pdf/xlsx (data), research-paper (/methods),
  redesign-existing-projects / gpt-taste / frontend-design (reviewers), code-review / simplify / security-review (Phase 11).

## Stack
Next.js App Router + TypeScript strict · Tailwind v4 + tokens in `src/styles/tokens.css` · shadcn/ui + Magic UI ·
GSAP (+ScrollTrigger, SplitText, @gsap/react) · three + R3F + drei + postprocessing · Recharts + D3 ·
MiniSearch + transformers.js embeddings (Xenova/all-MiniLM-L6-v2) · Vercel AI SDK with `AI_PROVIDER` switch ·
cmdk · zustand + URL params · zod · Vitest + Playwright + @axe-core/playwright · Python 3.11 data pipeline.

## Commands (PowerShell-compatible)
```
npm run dev              # dev server on http://localhost:3000
npm run build; npm start # local production build
npm test                 # vitest unit tests
npm run e2e              # playwright e2e + axe
npm run data:validate    # zod validation of data/processed/*.json
```

## Conventions
- Data flows: `data/raw` → `scripts/py` → `data/interim` → `scripts/ts` → `data/processed` → `src/lib/data.ts`.
- Types are inferred from zod schemas in `src/lib/schema.ts`.
- UI copy lives in `src/content/`.
- Dev-only routes (`/review`, `/styleguide`) return 404 when `NODE_ENV=production`.
- Colour meaning: blue = microgravity, amber/orange = Earth gravity/danger. Never meaning by colour alone.
- The human is on Windows; every command in docs must work in PowerShell.

## Next.js version note
@AGENTS.md — Next.js 16 has breaking changes; check `node_modules/next/dist/docs/` for APIs before use.
