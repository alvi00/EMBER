# EMBER — Exploration Microgravity Burn Evidence Resource
### NASA Space Apps Challenge 2026 · "Flame in Freefall: AI-Powered Fire Safety Insights from Microgravity Combustion Data"

> **To Claude Code:** This file is the single source of truth for the build. Read it completely before writing any code.
>
> **SCOPE: build the website only, running locally.** Do **not** deploy, do **not** push to GitHub, do **not** create calendar events, docs, slides or videos. The human handles deployment and the video later.
>
> **DEADLINE: the working website must be demo-ready by 1 October 2026 (Asia/Dhaka).** Work in the priority order of §11. Must-haves first, then nice-to-haves, then stretch. Never let a stretch goal break a must-have.
>
> Work **phase by phase, in order**. At the end of every phase run its **Checkpoint**, append a short entry to `PROGRESS.md`, and continue without waiting unless the phase says **ASK HUMAN**. Never invent scientific data (§14).

---

## 0. Status & resume prompt

**Phase 0 is already complete** (`CLAUDE.md` and `PROGRESS.md` exist, tool/skill inventory done). Update `CLAUDE.md` to match this revised file (scope, dropped tools, priorities), then start Phase 1.

Resume prompt the human pastes into Claude Code:
```
project.md has been replaced with a revised version. Read it fully.
Scope is now: build the website only, locally. No deploy, no GitHub push, no calendar, docs, slides or video.
Deadline is 1 October 2026, so follow the priority tiers in §11.
Update CLAUDE.md and PROGRESS.md to match, then start Phase 1 and keep going through the phases,
running every Checkpoint. Only stop for steps marked ASK HUMAN.
```

---

## 1. The challenge, in one paragraph

NASA has studied how flames behave in microgravity for decades and has accumulated a large body of experimental results. As crews head back to the Moon and on to Mars, that knowledge matters more than ever, but the sheer volume makes it hard to find, compare and understand. **The task:** build an interactive, AI-powered dashboard that **summarizes, ranks and interprets** these findings to deliver **fire-safety insights for human space exploration**.

EMBER's answer: a cinematic, evidence-first web app where every insight is traceable to a NASA source, ranked transparently for a chosen mission (ISS → Gateway → Lunar surface → Mars transit → Mars surface), and explorable through an AI copilot that refuses to answer beyond the evidence.

### 1.1 The three verbs judges will look for — and where EMBER does each

| Challenge verb | EMBER feature | Page |
|---|---|---|
| **Summarize** | Plain-language summaries per experiment + AI "What we know" digest | `/experiments/[id]`, `/dashboard` |
| **Rank** | Transparent Insight Score with adjustable weights, re-ranked per mission | `/insights` |
| **Interpret** | "Habitat Risk Lens" (evidence coverage for your cabin conditions) + "Ask the Flame" RAG copilot with citations | `/lens`, `/ask` |

### 1.2 Judging lens
Projects are typically judged on **Impact, Creativity, Validity, Relevance, Presentation**. When choosing between two options, prefer the one that improves **Validity** (traceable, honest science) first and **Presentation** second.

---

## 2. Product vision & experience principles

1. **Evidence before eye-candy, but both.** The visuals are stunning; every number on screen links to its source.
2. **Three audiences, one app:** mission planners (ranked insights), researchers (filters, conditions, sources, data gaps), public/judges (a 60-second "wow" story).
3. **Progressive disclosure:** headline → plain-language explanation → technical detail → source page.
4. **Honest AI:** cites sources inline, shows confidence, says "No evidence in the dataset" instead of guessing.
5. **Zero dead ends:** every empty state suggests a next action.
6. **Works offline for the demo:** with no AI key or no network, precomputed answers and insights still load, so the video recording never depends on a live API.

---

## 3. Tool & skill playbook

### 3.1 MCP servers used in this build

| MCP | Status | Use it for | Phases |
|---|---|---|---|
| **context7** | ✅ | Pull **current** docs before writing code for: Next.js (App Router), Tailwind CSS v4, shadcn/ui, React Three Fiber + drei, GSAP + @gsap/react, Vercel AI SDK, MiniSearch, cmdk, Recharts, D3, Playwright, Vitest. Rule: *call context7 before the first use of any library API in a phase.* | 1, 4–10 |
| **gsap** | ✅ | GSAP timelines, ScrollTrigger pinning, SplitText reveals, `useGSAP` patterns, reduced-motion handling. | 5, 6, 10 |
| **magicui** | ✅ | Fetch source for the approved Magic UI components (§6.6). Always fetch via the MCP instead of writing from memory. | 4–7 |
| **playwright** | ✅ | Visual QA screenshots at 3 breakpoints, console-error sweeps, e2e flows, axe accessibility scans. **Also the browser for data collection** (Phase 2) because claude-in-chrome is not loading. | 1–11 |
| **claude-in-chrome** | ❌ not loading | Optional. If it starts working, it may replace Playwright for Phase 2 browsing. Don't block on it. | 2 (optional) |

**Not used in this build** (the human does these later): Google Calendar, Claude Docs, Google Drive, Canva, Vercel, GitHub push.

### 3.2 Skills

| Skill | Use it for | Phase |
|---|---|---|
| **full-output-enforcement** | ON for every code step: complete files, no `// ...rest`, no TODO placeholders in shipped paths. | all |
| **design-taste-frontend** (primary) | Overall aesthetic direction, layout rhythm, typography. Load before Phase 4. | 4–8 |
| **high-end-visual-design** (primary) | Hero, landing story, premium details (grain, glow, depth, micro-interactions). | 4, 5, 10 |
| **stitch-design-taste** | Component-level polish and consistency across dashboard panels. | 6, 7 |
| **minimalist-ui** | Data-dense screens (explorer, detail, methods) — calm and readable. | 7, 8, 9 |
| **dataviz** | Chart choice, encodings, legends, axis/label clarity for every chart. | 6–8 |
| **pdf**, **xlsx** | Reading NASA PDFs and spreadsheets during data extraction. | 2, 3 |
| **research-paper** | Methods & Sources page with proper citations. | 9 |
| **redesign-existing-projects** | Polish audit of every page. | 10 |
| **gpt-taste**, **frontend-design** | Second-opinion taste critiques (reviewers only, not new directions). | 10 |
| **code-review**, **simplify**, **security-review** | Final code quality, dead code removal, key/secret handling check. | 11 |
| **run** | Starting the dev/prod server for checks. | 1–11 |
| **image-to-code** | Only if the human provides reference screenshots. | 4–7 |
| **deep-research** | Optional, uses subagents: ASK HUMAN before using it in Phase 2. | 2 |
| ❌ **industrial-brutalist-ui**, **imagegen-*** , **brandkit** | Don't use (style conflict / no image generation here). | — |

**Rule:** one primary aesthetic system (design-taste-frontend + high-end-visual-design). Other taste skills are reviewers, not competing directions.

---

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript (strict)** | Routing, server routes for AI, static generation |
| Styling | **Tailwind CSS v4** + CSS-variable design tokens | Fast, consistent theming |
| Components | **shadcn/ui** (Radix) + **Magic UI** (via MCP) | Accessible base + premium effects |
| Animation | **GSAP** (+ ScrollTrigger, SplitText, `@gsap/react`) for scroll storytelling; **motion** only for small layout transitions | |
| 3D | **three + @react-three/fiber + @react-three/drei + @react-three/postprocessing** | Interactive flame hero |
| Charts | **Recharts** (via shadcn charts) + **D3** scales/shapes (React renders SVG) for flammability map and coverage heatmap | |
| Search | **MiniSearch** (BM25) + precomputed embeddings | No database, instant, offline |
| Embeddings | **@huggingface/transformers** (`Xenova/all-MiniLM-L6-v2`) at build time; vectors in JSON | Free, no key |
| AI | **Vercel AI SDK** with a provider switch (`AI_PROVIDER=google|groq|openai|anthropic`) from `.env.local` | Use whichever key the team has |
| Command palette | **cmdk** | ⌘K search + ask |
| State | URL search params + **zustand** | Shareable views |
| Validation | **zod** | Single source of truth for data types |
| Brief export | **@react-pdf/renderer** (nice-to-have) | |
| Data pipeline | **Python 3.11+** (`pdfplumber`, `pandas`, optional `scikit-learn`) → JSON | |
| Testing | **Vitest** + **Playwright** + `@axe-core/playwright` | |
| Package manager | **npm**. The human is on **Windows**: every command must work in PowerShell. | |

Use **context7** to confirm current versions and install commands; pin versions in `package.json`.

The app must run with `npm run dev` and also build and run in production mode locally with `npm run build && npm start`. That's the end of scope — no hosting.

---

## 5. Repository structure (repo root = `C:\Projects\EMBER`)

```
EMBER/
├─ CLAUDE.md · PROGRESS.md · project.md · README.md
├─ .env.example                # AI_PROVIDER, keys (real keys only in .env.local, gitignored)
├─ data/
│  ├─ raw/                     # downloaded PDFs, CSVs, XLSX (gitignored)
│  ├─ sources.json             # registry of every source
│  ├─ interim/                 # extracted text, cleaned tables
│  └─ processed/
│     ├─ experiments.json · findings.json · measurements.json
│     ├─ chunks.json · embeddings.json · search-index.json
│     ├─ glossary.json · precomputed-answers.json
├─ scripts/
│  ├─ py/ extract_pdf.py, clean_tables.py, build_measurements.py, train_model.py (stretch)
│  └─ ts/ build-index.ts, build-embeddings.ts, extract-findings.ts, validate-data.ts, precompute-answers.ts
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                     # Landing story
│  │  ├─ dashboard/page.tsx           # Mission Control
│  │  ├─ experiments/page.tsx         # Explorer
│  │  ├─ experiments/[id]/page.tsx    # Detail
│  │  ├─ insights/page.tsx            # Ranked insights
│  │  ├─ lens/page.tsx                # Habitat Risk Lens
│  │  ├─ ask/page.tsx                 # Ask the Flame
│  │  ├─ compare/page.tsx             # nice-to-have
│  │  ├─ methods/page.tsx             # Methods, sources, limitations
│  │  ├─ about/page.tsx
│  │  ├─ review/page.tsx              # DEV ONLY: finding verification
│  │  ├─ styleguide/page.tsx          # DEV ONLY
│  │  ├─ api/ask/route.ts · api/summarize/route.ts
│  │  └─ layout.tsx, globals.css, not-found.tsx, error.tsx, loading.tsx, opengraph-image.tsx
│  ├─ components/ ui/ magicui/ three/ charts/ story/ dashboard/ insights/ ask/ shell/
│  ├─ content/                 # all UI copy
│  ├─ lib/ data.ts, schema.ts, scoring.ts, coverage.ts, search.ts, missions.ts, ai/
│  └─ styles/tokens.css
├─ tests/ (vitest) · e2e/ (playwright) · public/
```
Dev-only routes (`/review`, `/styleguide`) must return 404 when `NODE_ENV=production`.

---

## 6. Design system — "Deep space, living flame"

Load **design-taste-frontend** and **high-end-visual-design** before implementing. Encode everything as tokens in `src/styles/tokens.css` + Tailwind `@theme`.

### 6.1 Concept
The interface is a spacecraft cabin at night; the only light sources are the flames. **Blue = microgravity / cool / space. Amber-orange = Earth gravity / sooty / danger.** This color meaning is used consistently in every chart so users learn it once.

### 6.2 Color tokens (dark theme)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#05060A` | page |
| `--bg-elev-1` | `#0B0D14` | cards |
| `--bg-elev-2` | `#11141D` | popovers, drawers |
| `--line` | `rgba(255,255,255,0.08)` | hairlines |
| `--text` | `#E8EAF0` | primary text |
| `--text-muted` | `#8A90A2` | secondary |
| `--flame-micro` | `#4CC9F0` | microgravity / blue flame |
| `--flame-violet` | `#7B61FF` | transitions / AI accents |
| `--flame-earth` | `#FF7A18` | 1 g flame / warnings |
| `--flame-core` | `#FFD166` | key numbers |
| `--danger` | `#FF4D4F` | high severity |
| `--ok` | `#3DDC97` | extinguished / safe outcome |
| `--unknown` | `#5B6275` | no data (hatched pattern) |

`flame-gradient = linear(135deg, micro → violet → earth)` — sparingly (hero title, primary CTA border, active mission chip).
All text pairs pass **WCAG AA**. Never encode meaning by color alone — pair with icon, pattern or label.

### 6.3 Typography
Display **Instrument Serif** (italic for emotive words). UI **Geist Sans** (Inter fallback). Data **Geist Mono**, tabular figures for all numbers/units/IDs. Scale 12/14/16/18/24/32/48/72/112. Load with `next/font`.

### 6.4 Layout & surfaces
12-col grid, max 1440, gutters 24 (16 mobile), 8-pt spacing. Cards: `--bg-elev-1`, 1px `--line`, radius 16, inner top highlight. SVG film grain on the page background (3–4%). Glow only on focused/active elements.

### 6.5 Motion
150ms micro / 300ms UI / 600–900ms story. `power3.out` / `expo.out`. GSAP for scroll choreography, motion for UI state. **`prefers-reduced-motion`**: no scrub, no 3D autoplay, no particle drift, fades ≤150ms.

### 6.6 Approved Magic UI components (fetch via magicui MCP)
- **Particles** → hero starfield only
- **NumberTicker** → dashboard/landing KPIs (once, on first view)
- **BentoGrid** → Mission Control layout
- **BorderBeam** → selected insight / active mission card
- **AnimatedBeam** → "How EMBER works" pipeline diagram
- **Marquee** → experiment acronyms ribbon
- **TextAnimate / BlurFade** → landing section headings
- **ShineBorder** → primary CTA only
- **AnimatedGridPattern** → methods page background (very low opacity)

No Meteors, no Confetti, max one effect per viewport.

### 6.7 Icons
`lucide-react` at 1.5px stroke + custom SVG glyphs: droplet flame, solid-sheet flame, gas-jet flame, smoke, suppression.

---

## 7. Page specs

**Global shell:** top nav (Logo · Dashboard · Experiments · Insights · Risk Lens · Ask · Methods), **Mission Switcher** chip (URL `?mission=`), **⌘K Command Palette** (search experiments/findings/glossary or "Ask the Flame: …"), floating "Ask" button, footer with data-provenance line and "Not an official NASA product" disclaimer. Mobile: nav becomes a bottom sheet.

### 7.1 `/` Landing — "Flame in Freefall" (the 60-second wow) · MUST
GSAP ScrollTrigger scenes:
1. **Hero** — full-bleed 3D flame (§8). Headline: *"On Earth, fire rises. In space, it has nowhere to go."* **Gravity slider** (Space 0 g · Moon 0.17 g · Mars 0.38 g · Earth 1 g) morphs the flame live. CTAs: "Open Mission Control" (ShineBorder) · "Ask the Flame".
2. **Why it's different** — pinned, 3 steps that scrub the flame. Copy comes only from verified findings, with a source chip under each step.
3. **The archive problem** — Marquee of acronyms + NumberTickers computed from data (investigations, findings, sources, test points).
4. **How EMBER works** — AnimatedBeam: NASA sources → extraction → human verification → ranking → you.
5. **Pick your mission** — five mission cards → `/insights?mission=…`.
6. **Footer CTA.**

### 7.2 `/dashboard` — Mission Control (BentoGrid) · MUST
KPI row · experiment timeline (bars by platform) · Top 5 insights for current mission · evidence-coverage mini-heatmap (gravity × O2, hatched = no data → `/lens`) · findings by category chart · **AI digest** (4–6 sentences with citations from `/api/summarize`, precomputed fallback). Mission switch updates every tile.

### 7.3 `/experiments` — Explorer · MUST
Filter rail (drawer on mobile): category, platform, fuel, facility, year range, O2 / pressure / flow ranges, has-raw-data, verified-only. Cards/Table toggle (sortable table, sticky header). Hybrid search bar with highlighted matches. All state in URL.

### 7.4 `/experiments/[id]` — Detail · MUST
Header (acronym, full name, platform, facility, years, PSI link). Tabs: **Summary** (plain language + "Why it matters for Moon/Mars") · **Findings** (confidence, category, mission relevance, source chip → SourceDrawer) · **Conditions** (ranges table + small test-matrix chart) · **Data** (measurement table + CSV download, if data exists) · **Sources**. Actions: "Ask about this experiment", "Compare with…" (if compare exists).

### 7.5 `/insights` — Ranked insights · MUST
Mission switcher; ranked InsightCards (statement, plain language, safety implication, score, badges). **Weight panel** sliders (Severity, Mission applicability, Evidence strength, Actionability) — live re-rank with FLIP animation. Score-breakdown popover per card (stacked bar + formula). Filters by category and confidence. *Nice-to-have:* "Export mission brief (PDF)".

### 7.6 `/lens` — Habitat Risk Lens · MUST
Inputs: gravity (preset/custom), cabin O2 %, pressure (kPa), ventilation flow (cm/s), fuel/material family, geometry.
Outputs: (1) **coverage verdict** — *Directly tested* / *Near tested conditions* / *Extrapolation — no direct evidence* (§9.6); (2) nearest 5 test points with distance and outcome; (3) **flammability map** — O2 vs flow scatter for the fuel family, outcome by color **and** marker shape, user's cabin as pulsing crosshair; (4) relevant insights; (5) **evidence gaps** panel ("where future experiments are needed"); (6) *stretch:* ML estimate (§11 Phase 3 step 7).
Permanent disclaimer: *Research exploration tool. Not for operational safety decisions.*

### 7.7 `/ask` — Ask the Flame · MUST
Streaming chat; citation chips `[FLEX · p.4]` → SourceDrawer with the chunk highlighted and a link to the original. Suggested question chips. Answer footer: confidence, sources used, "not covered by the data". Graceful refusal when retrieval is weak. Mini version in ⌘K and floating button. "Offline mode" badge when no key.

### 7.8 `/methods` · MUST (short is fine) — load **research-paper**
Data sources, pipeline diagram, extraction & verification protocol, scoring formula, coverage metric, limitations, reproduction steps, references, NASA PSI acknowledgement, AI-use disclosure.

### 7.9 `/about` · MUST (short)
Team placeholder fields (the human fills names), challenge statement, credits, disclaimer.

### 7.10 `/compare` · NICE-TO-HAVE
2–3 experiments side-by-side: conditions, outcomes, key findings, condition-coverage radar.

---

## 8. Signature visual: interactive 3D flame · MUST

`components/three/FlameScene.tsx` (React Three Fiber):
- Custom `ShaderMaterial` flame (fBm-noise flicker) on a billboard or low-poly sphere.
- Uniform `uGravity` 0→1: 0 g → near-**spherical**, blue, dim, slow flicker; 1 g → **teardrop stretched upward**, yellow-orange sooty tip, faster flicker. Interpolate shape stretch, color ramp (`--flame-micro` → `--flame-earth`), luminosity and flicker rate.
- Faint ember particles that rise only when gravity > 0 (buoyancy cue). Subtle bloom.
- Performance: `dpr={[1, 1.75]}`, pause rendering off-screen, dynamic import `ssr:false`, 60 fps target on a mid laptop.
- **Fallbacks:** static poster (render a frame to PNG with Playwright) for reduced motion, no WebGL, or low-power devices.
- Accessibility: canvas `aria-hidden`; the slider is a real `<input type="range">` with value text ("Moon, 0.17 g").
- Small label: "Artistic visualization — trends match the literature; not a simulation."

Use **gsap** MCP for the scroll-linked `uGravity` timeline and **context7** for R3F/drei APIs.

---

## 9. Data layer (the core of Validity)

### 9.1 Primary sources
- **NASA Physical Sciences Informatics (PSI)** — `https://psi.nasa.gov/` — flight combustion data (raw + processed data, documentation, publication lists). Combustion investigations include ACME (BRE, E-FIELD Flames, s-Flame and others), BASS, BASS-II, CFI, FLEX, FLEX-2, SAFFIRE I–III, SAME / SAME-R, SLICE, SPICE, DAFT and more. Downloads need a free PSI account → **ASK HUMAN** to log in inside the Playwright browser window.
- **NASA Technical Reports Server (NTRS)** — `https://ntrs.nasa.gov/` — public reports and presentations; use its public search API (verify the endpoint with a test call).
- **science.nasa.gov / nasa.gov** combustion explainers (SoFIE, Saffire, Confined Combustion) for context.
- Paywalled journal papers: store the citation and short extracted facts only; don't re-host PDFs.

### 9.2 Source registry (`data/sources.json`)
```ts
Source = { id: string; title: string; authors?: string[]; year?: number;
  type: "psi-dataset"|"ntrs-report"|"journal"|"nasa-web"|"presentation";
  url: string; accessed: string; license?: string; localPath?: string }
```

### 9.3 Core schemas (`src/lib/schema.ts`, zod; TS types inferred)
```ts
Experiment = {
  id; acronym; fullName;
  category: ("droplet"|"solid"|"gaseous-premixed"|"gaseous-nonpremixed"|"smoke"|"suppression"|"large-scale")[];
  platform: "ISS"|"Cygnus"|"Space Shuttle"|"Drop tower"|"Parabolic aircraft"|"Ground";
  facility?; years: { start: number; end?: number }; agencies: string[]; fuels: string[];
  conditions: { o2Percent?: Range; pressureKpa?: Range; flowCmS?: Range; gravityG?: Range; diluent?: string[] };
  objectives; summaryPlain; whyItMatters; psiUrl?; sourceIds: string[];
  hasRawData: boolean; verified: boolean;
}

Finding = {
  id; experimentId; statement; plainLanguage;
  category: "ignition"|"flame-spread"|"extinction"|"suppression"|"smoke-detection"|"materials"|"cool-flames"|"scale-effects";
  safetyImplication;
  evidence: { sourceId; page?: number; chunkId; excerpt /* ≤ 25 words, must be a substring of the chunk */ }[];
  missionRelevance: { iss; gateway; lunar; marsTransit; marsSurface } /* each 0–3 */;
  severity: 1–5; actionability: 1–5; evidenceStrength: 1–5;
  confidence: "high"|"medium"|"low";
  status: "ai-draft" | "verified" | "rejected";   // only a human sets "verified"
  reviewer?: string;
}

Measurement = {
  id; experimentId; testId; fuel;
  geometry: "thin-sheet"|"thick"|"droplet"|"wire"|"gas-jet"|"cylinder";
  thicknessMm?; o2Percent?; pressureKpa?; flowCmS?; gravityG: number;
  outcome: "burned"|"self-extinguished"|"no-ignition"|"extinguished-by-agent";
  spreadRateMmS?; burnDurationS?; sourceId; page?; notes?;
}

Chunk = { id; sourceId; experimentIds: string[]; page?: number; text; tokens: number }
```

### 9.4 Mission profiles (`src/lib/missions.ts`)
Gravity per mission (0, 0.166, 0.38, 1). Cabin pressure/O2 defaults **only if a NASA source is found** (store sourceId); otherwise user-editable and labelled "assumed".

### 9.5 Insight Score (`src/lib/scoring.ts`)
```
score(f, mission, w) = 100 × ( w.sev·norm(severity) + w.app·(missionRelevance[mission]/3)
                             + w.evd·norm(evidenceStrength) + w.act·norm(actionability) ) / Σw
default w = { sev: 0.35, app: 0.30, evd: 0.20, act: 0.15 }
status "ai-draft" → × 0.7 and an "AI draft — pending review" badge; "rejected" never shown
```
Vitest: ordering, weight normalization, all-zero weights → defaults.

### 9.6 Coverage metric (`src/lib/coverage.ts`)
Normalize each condition dimension to [0,1] over the dataset range (log scale for flow and pressure). Weighted Euclidean over available dimensions; missing dims skipped and reported. Thresholds: `< 0.05` directly tested, `< 0.15` near, else extrapolation. A gravity mismatch (tested at 0 g, asked at 0.17 g) forces at least "near" plus a partial-gravity warning. Vitest with hand-built cases.

---

## 10. AI layer

### 10.1 Provider switch (`src/lib/ai/provider.ts`)
`AI_PROVIDER` + key from `.env.local` → `getModel()`. No key → **OFFLINE mode**: `/api/ask` answers from `precomputed-answers.json` when the question matches (cosine ≥ 0.8), else returns retrieval-only results ("Here are the most relevant sources…"). UI shows an "offline mode" badge. Keys never reach the client.

### 10.2 Retrieval (`src/lib/search.ts`)
MiniSearch BM25 top-20 ∪ cosine top-20 → reciprocal-rank fusion → top-8 chunks. Query embedding at runtime with the same transformers.js model in the Node route, cached in memory.

### 10.3 Answer prompt (`src/lib/ai/prompts.ts`)
1. Answer **only** from the provided chunks. 2. Cite after every factual sentence as `[[chunkId]]`. 3. If unsupported, say so and list closest available topics. 4. Sections: "What the evidence shows" / "What it means for <mission>" / "Not covered by the data". 5. No operational safety directives. 6. ≤ 200 words unless asked.
Post-process: `[[chunkId]]` → CitationChips; strip any id not in the retrieved set and flag that sentence.

### 10.4 Build-time extraction (`scripts/ts/extract-findings.ts`)
Per experiment, ask the LLM for candidate findings as strict JSON matching `Finding` with `status: "ai-draft"`. Validate with zod; reject any finding whose excerpt isn't a substring of its chunk. If no AI key is available at this point, **ASK HUMAN** for one (or draft findings directly as Claude Code from the chunks, same rules and same `ai-draft` status).

### 10.5 Verification UI (`/review`, dev-only)
Source chunk (highlighted excerpt) left, editable fields right. Buttons ✅ Verify · ✏️ Edit & verify · ❌ Reject; shortcuts V/E/R/J/K. Writes to `findings.json`. Claude Code never sets `verified`. The public UI shows both verified findings and AI drafts, clearly badged, so the site is complete even before review finishes.

### 10.6 Precompute (`scripts/ts/precompute-answers.ts`)
Run the suggested questions + 5 mission digests through the pipeline, store answers with citations. The demo recording must work with the network off.

---

## 11. Build phases (priority-ordered for the 1 October deadline)

**Tiers:** **MUST** = required for the demo video. **NICE** = do if MUSTs are done and checked. **STRETCH** = only if time remains at the end.
Time budgets are targets; if a phase overruns by 50%, cut its NICE items and move on.

### Phase 0 — Setup · ✅ DONE
Only update `CLAUDE.md` + `PROGRESS.md` to this revised scope.

### Phase 1 — Scaffold · MUST · ~1 h
1. Scaffold Next.js in the repo root (`npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"`; confirm flags via context7).
2. shadcn/ui init + components: button, card, badge, tabs, dialog, drawer, sheet, slider, select, input, tooltip, popover, table, scroll-area, separator, skeleton, sonner, command, chart, toggle-group.
3. Install deps from §4 (dev: vitest, @playwright/test, @axe-core/playwright, prettier, prettier-plugin-tailwindcss).
4. Fonts, `tokens.css`, Tailwind `@theme`.
5. App shell + empty routes for every page in §7 + `not-found`/`error`/`loading`.
6. `.env.example`, `.gitignore` (data/raw, .env*). Local `git init` and commits per phase are fine — **no remote, no push**.
**Checkpoint:** `npm run build` passes; Playwright visits every route, 0 console errors; shell screenshots at 375 / 768 / 1440.

### Phase 2 — Data collection · MUST · ~3 h
1. **ASK HUMAN** to log into psi.nasa.gov in the Playwright browser window (or skip PSI downloads if they can't, and rely on public PSI pages + NTRS).
2. Using the **playwright** MCP browser: from the PSI combustion investigation list, record acronym, full name, platform, facility, dates, description, publications and data availability → `experiments.json` (unverified) + `sources.json`.
3. Download documentation PDFs and small data files (CSV/XLSX) into `data/raw/<experiment>/`. Record URLs only for big video/image archives.
4. NTRS search per acronym (e.g. "BASS-II flame spread", "FLEX droplet cool flame", "Saffire flame spread", "ACME s-Flame", "CFI cool flame"); add relevant reports, download open PDFs.
5. Priority (depth over breadth): **BASS/BASS-II, FLEX/FLEX-2, SAFFIRE I–III, ACME, CFI** → then SAME/SAME-R, SPICE, SLICE, SoFIE, Confined Combustion if time allows.
**Checkpoint:** `validate-data.ts` passes (every experiment has ≥1 source); file manifest printed in PROGRESS.md.

### Phase 3 — Processing & knowledge base · MUST · ~3 h
1. `extract_pdf.py` (use **pdf** skill guidance): per-page text → ~350-token chunks, 60 overlap, page numbers kept → `chunks.json`.
2. `clean_tables.py` + `build_measurements.py` (use **xlsx** skill guidance): normalize test data to `Measurement` rows (units → %, kPa, cm/s, mm; every conversion commented and listed on `/methods`). Fix mangled headers; spreadsheet error cells (`#DIV/0!`, `#REF!`) = missing, never values.
3. `extract-findings.ts` → `ai-draft` findings. Target **≥ 40 findings across ≥ 8 investigations**.
4. Build `/review` now; tell the human it's ready so the team can verify in parallel while you continue.
5. `build-embeddings.ts`, `build-index.ts`.
6. `glossary.json` (microgravity, buoyancy, opposed/concurrent flow spread, cool flame, extinction limit, soot, CIR, MSG…) in own words.
7. STRETCH (only if ≥150 labelled rows for one fuel family): `train_model.py` — logistic regression / gradient boosting for `burned`, grouped k-fold by experiment, report ROC-AUC + calibration, export to JSON for in-browser inference. Ship only if AUC ≥ 0.8; otherwise say so on `/methods`.
**Checkpoint:** zod validation passes for all JSON; counts reported; 3 random findings spot-checked against their source page.

> If Phase 2–3 data is slow, **continue with Phases 4–5 in parallel** using whatever real records already exist. UI must read from data files from day one — never hard-code stats or fake records.

### Phase 4 — Design system · MUST · ~1.5 h
Load **design-taste-frontend** + **high-end-visual-design** (+ **image-to-code** if references are given).
1. `/styleguide`: colors, type scale, buttons, badges (severity, confidence, verified vs AI draft), cards, CitationChip, MissionChip, empty/loading/error states, focus rings.
2. Fetch approved Magic UI components via **magicui** MCP; theme to tokens.
3. Shell: Nav with animated active indicator, MissionSwitcher, CommandPalette, SourceDrawer, floating Ask button, Footer.
**Checkpoint:** styleguide screenshots ×3; axe = 0 serious/critical.

### Phase 5 — Landing + 3D flame · MUST · ~4 h
Load **high-end-visual-design**; use **gsap**, **context7**, **magicui**.
1. FlameScene (§8) with gravity uniform + fallbacks.
2. Landing sections (§7.1) with ScrollTrigger scenes, SplitText headline, scrubbed `uGravity`; `useGSAP` with cleanup; refresh ScrollTrigger after fonts load and on resize.
3. All numbers from data; science copy from findings with chips.
4. Reduced-motion variant.
**Checkpoint:** 6 scroll screenshots; reduced-motion screenshot; performance trace (no long frame stalls); CLS < 0.1.

### Phase 6 — Mission Control · MUST · ~2.5 h
Load **stitch-design-taste** + **dataviz**. BentoGrid (§7.2), KPIs, timeline, top insights, mini-heatmap, category chart, AI digest (stub → real in Phase 9), skeletons, mobile single-column.
**Checkpoint:** screenshots ×3; mission switch updates all tiles; keyboard traversal works.

### Phase 7 — Explorer & detail · MUST · ~3 h
Load **minimalist-ui** + **dataviz**. `/experiments` (filters, cards/table, hybrid search, URL state) and `/experiments/[id]` (tabs, `generateStaticParams`, SourceDrawer, CSV export).
**Checkpoint:** e2e: filter → open detail → open source drawer → reload URL restores the view. Screenshots ×3.

### Phase 8 — Insights + Risk Lens · MUST · ~3.5 h
1. `scoring.ts` + tests → `/insights` with weight panel, FLIP re-rank, breakdown popovers.
2. `coverage.ts` + tests → `/lens` with verdict, nearest points, FlammabilityMap (D3 + SVG), evidence gaps, relevant insights.
3. NICE: mission brief PDF export.
**Checkpoint:** unit tests green; e2e: Lunar mission → move weights → order changes; Lens verdicts correct for 3 hand-picked points.

### Phase 9 — AI copilot, summaries, methods · MUST · ~3 h
1. **ASK HUMAN** for an AI provider + key in `.env.local` (skip if they have none — offline mode must still work).
2. Provider switch, retrieval, prompts, citation parser + hallucination guard (§10).
3. `/api/ask` streaming + `/ask` page + ⌘K mini-ask + floating button; `/api/summarize` for the dashboard digest.
4. Precompute demo answers; offline badge.
5. `/methods` (load **research-paper**) and `/about`.
**Checkpoint:** 12 suggested + 5 out-of-scope questions: every citation resolves to a real chunk; out-of-scope refused gracefully; works with the key removed.

### Phase 10 — Polish · MUST · ~2.5 h
1. **redesign-existing-projects** audit of every page, then **gpt-taste** / **frontend-design** critique → fix all high-priority items.
2. Micro-interactions: hover/press, focus rings, toasts, copy-link, page transitions (**gsap** MCP for any new choreography).
3. Empty/loading/error states everywhere.
4. Mobile pass at 375 px: bottom-sheet nav, filter drawer, scrollable charts with text summaries.
5. Meta: titles, descriptions, OG image, favicon.
6. NICE: `/compare`.
**Checkpoint:** before/after screenshots per page in PROGRESS.md.



### Phase 11 
ML estimate in Lens · light theme · Bengali (bn) toggle for key UI copy · narrated mission scenario cards · shareable insight images.


### Phase 12 — Local QA & demo-ready · MUST · ~2 h
Playwright full run: all e2e flows; screenshots of every route × 3 breakpoints × (normal, reduced-motion); console errors = 0; axe = 0 serious/critical.
Lighthouse against npm run build && npm start locally — targets: Performance ≥ 85 landing / ≥ 90 elsewhere; Accessibility ≥ 95; Best Practices ≥ 95; SEO ≥ 95. Lazy-load 3D, split heavy charts, compress assets; quantize embeddings.json if > 5 MB.
code-review, simplify, security-review passes; fix findings.
Walk the demo path (§12) end-to-end in production mode with the network off; it must be flawless.
README.md: what it is, local setup (PowerShell commands), env vars, data sources, how to re-run the data pipeline, architecture, AI-use disclosure, limitations.
Final PROGRESS.md report: what's done per tier, test/Lighthouse results, known issues, how to run. Then STOP. No deploy, no push.
---

## 12. Demo path (what the human will record — make sure it's flawless)
1. Landing: drag the gravity slider Earth → Mars → Moon → Space; the flame morphs.
2. Scroll: the archive problem, counts tick up, the pipeline animates.
3. Mission Control → switch to *Lunar surface* → top insights re-rank; open one → SourceDrawer shows the NASA source.
4. Risk Lens: set a lunar habitat cabin → coverage verdict + evidence-gaps panel.
5. Ask the Flame: a cited answer; an out-of-scope question honestly declined.
6. (If built) Export the mission brief PDF.

---

## 13. Definition of Done
- [ ] All MUST pages in §7 implemented, responsive (375 → 1920), dark theme polished.
- [ ] ≥ 40 findings across ≥ 8 investigations, each with source + page/excerpt; verified vs AI-draft clearly badged.
- [ ] Every number in the UI computed from `/data/processed`.
- [ ] Ranking transparent (formula visible, weights adjustable) and unit-tested.
- [ ] Lens coverage logic unit-tested; disclaimer visible.
- [ ] AI answers cite real chunks; fake citations stripped; offline mode works.
- [ ] Playwright e2e + visual + axe green; 0 console errors; reduced motion respected.
- [ ] Lighthouse targets met on the local production build.
- [ ] Demo path flawless offline. README complete. PROGRESS.md final report written.
- [ ] Nothing deployed, nothing pushed.

---

## 14. Guardrails (non-negotiable)
1. **No invented science.** Never fabricate experiment names, dates, values, outcomes or quotes. If it isn't in a source, it doesn't ship. Unknown = "no data".
2. **Traceability:** every finding/measurement stores `sourceId` (+ page/chunk); the UI always offers the path back to the source.
3. **Humans verify.** Claude Code may draft findings (`ai-draft`) but never sets `verified`.
4. **Not operational guidance.** Lens, ML estimate and copilot are labelled research-exploration tools; not official NASA products.
5. **Copyright:** short excerpts (≤ 25 words) as evidence, link to originals; don't re-host paywalled PDFs; don't use NASA insignia/logos as branding.
6. **Secrets:** keys only in `.env.local`; never committed, never sent to the client.
7. **Complete code only** (full-output-enforcement).
8. **Accessibility is a feature:** keyboard-complete, visible focus, semantic HTML, alt text, color-independent meaning, reduced motion.
9. **Check docs:** context7 before using any library API.
10. **Verify visually:** after any UI change, take a Playwright screenshot and look at it before marking the step done.
11. **Scope:** website only, local. No deploy, no push, no calendar/docs/slides/video.

---

## 15. Reference links (starting points — verify each)
- NASA Physical Sciences Informatics: https://psi.nasa.gov/
- PSI investigations by research area: https://www.nasa.gov/physical-sciences-informatics-psi/psi-investigations-by-research-area/
- NASA Technical Reports Server: https://ntrs.nasa.gov/
- Why NASA studies flames in space: https://science.nasa.gov/biological-physical/resources/explainers-infographics/why-nasa-is-studying-flames-in-space/
- Saffire operations overview (NTRS): https://ntrs.nasa.gov/api/citations/20170002628/downloads/20170002628.pdf
- ACME overview (NTRS): https://ntrs.nasa.gov/api/citations/20210022542/downloads/ACME%20JASMAC-33%2020211007.pdf
- Challenge page: https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall-ai-powered-fire-safety-insights-from-microgravity-combustion-data/
