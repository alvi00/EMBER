# EMBER

**Exploration Microgravity Burn Evidence Resource.** An evidence-first web app that summarizes, ranks and interprets
NASA microgravity combustion research into fire-safety insights for the ISS, Gateway, the Moon and Mars.

Built for the NASA Space Apps Challenge 2026, *Flame in Freefall*. Every finding, number and answer in the app links
back to a NASA source (Physical Sciences Informatics or the Technical Reports Server).

> Not an official NASA product. A research exploration tool, not guidance for operational safety decisions.

## What is in the app

| Page | What it does |
|---|---|
| `/` | The story: an interactive 3D flame with a gravity slider (Space, Moon, Mars, Earth), why fire behaves differently in orbit, the archive problem, how EMBER works, and five mission scenario cards that can read each mission's cited briefing aloud (browser speech, captions on screen). |
| `/dashboard` | Mission Control: KPIs, top 5 insights, a cited AI evidence digest, gravity × oxygen coverage heatmap, findings by category, investigations over time. The mission switcher in the header re-ranks everything. |
| `/experiments` | Explorer: 29 investigations with filters, cards or table, and hybrid keyword + semantic search over their source documents. All state is in the URL. |
| `/experiments/[id]` | Detail: summary, findings with evidence, condition ranges, test-point data with CSV export, sources. |
| `/insights` | Ranked insights with a visible scoring formula, adjustable weights and a per-card score breakdown. Print view exports a mission brief; each insight downloads as a share image (PNG) that carries its source and review status. |
| `/lens` | Habitat Risk Lens: enter cabin gravity, oxygen, pressure and airflow; see how close NASA tests came, the nearest test points, a flammability map and the evidence gaps. |
| `/ask` | Ask the Flame: questions answered only from retrieved NASA passages, a citation after every claim, and an honest refusal when the data is silent. Also available from the floating Ask button and ⌘K. |
| `/compare` | Two or three experiments side by side: conditions tested, outcomes, key findings. |
| `/methods` | Sources, pipeline, extraction and verification protocol, scoring and coverage formulas, limitations, references. |
| `/about` | Challenge, credits, disclaimer, team. |

Dev-only (404 in production): `/review` for human verification of AI-drafted findings, `/styleguide`.

**বাংলা:** the language button in the header (or the mobile menu) switches the key interface copy (navigation, the
landing hero, page headers and disclaimers) to Bengali. Findings, quoted evidence, source titles and answers stay in
English so every quote remains verbatim and traceable.

## Run it locally (Windows PowerShell)

Requirements: Node.js 22 and npm. Python 3.11 is only needed to re-run the data pipeline.

```powershell
npm install
npm run dev                 # http://localhost:3000
```

Production build:

```powershell
npm run build; npm start    # http://localhost:3000
```

The processed dataset (`data/processed/*.json`) is committed, so the app runs without re-collecting anything.

### Recording the demo offline

The demo path (landing gravity slider → archive and pipeline → Mission Control on *Lunar surface* → source drawer →
Risk Lens → Ask the Flame, cited answer and a declined question → mission brief) works with the network off:

1. Run one semantic search while online once, so the query-embedding model is cached in `./models-cache`
   (already done on the build machine).
2. `npm run build; $env:AI_PROVIDER = "offline"; npm start`, then open http://localhost:3000.
   With a key configured and no network, EMBER also falls back to the saved answers and says so on screen.

### AI provider (optional)

Ask the Flame and the fresh-digest button use a language model when one is configured. Without one, EMBER runs in
**offline mode**: saved answers for the suggested questions and mission digests, and verbatim passages for everything
else. Out-of-scope questions are declined in both modes.

```powershell
Copy-Item .env.example .env.local
notepad .env.local          # set AI_PROVIDER and the matching key
```

| Variable | Meaning |
|---|---|
| `AI_PROVIDER` | `groq`, `google`, `openai` or `anthropic`. Empty or unknown means offline mode. |
| `AI_MODEL` | Optional model override. Defaults: groq `openai/gpt-oss-120b`, google `gemini-2.5-flash`, openai `gpt-5-mini`, anthropic `claude-sonnet-5-5`. |
| `GROQ_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | The key for the chosen provider. |

Keys are read only on the server and never sent to the browser. `.env.local` is gitignored. To force offline mode
for one run: `$env:AI_PROVIDER = "offline"; npm start`.

### Semantic search model

Query embeddings use `Xenova/all-MiniLM-L6-v2` through transformers.js, cached in `./models-cache` (gitignored). The
first semantic search downloads it once (about 23 MB). If the model cannot load, search falls back to keyword (BM25)
only and everything else keeps working.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000. |
| `npm run build` / `npm start` | Production build and server. |
| `npm run typecheck` | TypeScript, strict. |
| `npm run lint` | ESLint (Next.js + React hooks rules). |
| `npm test` | Vitest unit tests: scoring, coverage metric, citation guard, compare helpers. |
| `npm run e2e` | Build, then Playwright end-to-end tests on desktop (1440 px) and mobile (375 px) against a production server on port 3100, with the copilot forced offline. `npm run e2e:quick` reuses the last build. |
| `npm run data:validate` | Validates every processed JSON file against the zod schemas and cross-checks ids, chunks, excerpts and citations. |

## Data sources

- **NASA Physical Sciences Informatics (PSI)**, psi.nasa.gov: investigation records, documents and experimental
  tables (CC0). Collected through the public PSI repository API.
- **NASA Technical Reports Server (NTRS)**, ntrs.nasa.gov: reports, conference papers and presentations, through the
  NTRS API.

`data/sources.json` lists every source with URL, licence and access date; `data/raw-manifest.md` lists what was
downloaded. Paywalled journal articles are linked, never re-hosted.

## Re-running the data pipeline

The raw downloads (`data/raw/`) are not committed. With them in place:

```powershell
python -m pip install pymupdf
python scripts/py/build_registry.py        # data/sources.json + experiments.json
python scripts/py/extract_pdf.py           # page-aware text chunks (about 350 tokens, 60 overlap)
python scripts/py/clean_tables.py          # normalised experimental tables
python scripts/py/build_measurements.py    # test points with units converted and outcomes mapped
npx tsx scripts/ts/extract-findings.ts     # findings; rejects any excerpt that is not verbatim in its chunk
npx tsx scripts/ts/build-embeddings.ts     # chunk embeddings (int8)
npx tsx scripts/ts/build-index.ts          # BM25 index
npx tsx --conditions=react-server scripts/ts/precompute-answers.ts   # offline answers; needs a key
npm run data:validate
```

Flow: `data/raw` → `scripts/py` → `data/interim` → `scripts/ts` → `data/processed` → `src/lib/data.ts` → pages.

## Architecture

```
src/
  app/                 routes (App Router); api/ask (streaming NDJSON), api/summarize, api/search, api/chunk,
                       api/catalog (palette data), api/share/[id] (insight PNGs, built at build time)
  components/          shell (nav, ⌘K, source drawer, mini-ask), story (landing), charts, ask, compare, lens, ...
  content/             UI copy
  hooks/               mission state, streaming answers, client flags
  lib/
    schema.ts          zod schemas; every type is inferred from them
    data.ts            processed data (server-only)
    scoring.ts         insight score
    coverage.ts        evidence-coverage metric for the Risk Lens
    search.ts          hybrid retrieval: BM25 + embeddings, reciprocal rank fusion
    ai/                provider switch, prompts, answer engine, citation guard, digest, precomputed answers
  styles/tokens.css    design tokens (dark theme, validated chart palettes)
scripts/py, scripts/ts data pipeline
data/processed         the dataset the app reads
tests/, e2e/           Vitest and Playwright
```

Stack: Next.js 16 (App Router, TypeScript strict), Tailwind CSS 4, shadcn/ui and Magic UI, GSAP with ScrollTrigger,
three.js with React Three Fiber, D3 scales with hand-built SVG and HTML charts, MiniSearch, transformers.js, Vercel AI
SDK, zod, zustand, Vitest, Playwright with axe-core. Heavy pieces (3D flame, command palette, source drawer, toasts,
mobile menu, count-up animation, layout animation) load on first use so every page's first load stays small.

### How an answer is made

1. Retrieve: the top 20 BM25 and top 20 embedding matches over 3,404 passages, fused with reciprocal rank fusion,
   keep 8.
2. Gate: if the closest passage has cosine similarity below 0.48, decline and name the nearest experiments.
3. Answer: the model sees only those passages, as aliases `S1`–`S8`, and must cite one after every factual sentence.
4. Check: citations to anything not retrieved are removed and their sentences flagged in the UI.

## Use of AI

- Claude Code (Anthropic) wrote the application code and data scripts, drafted the candidate findings and their scores
  from the extracted source text, and wrote the glossary. Every drafted finding carries the status `ai-draft` and is
  badged as such until a human verifies it in `/review`; the model never marks anything verified.
- Ask the Flame and the Mission Control digest use the configured model (Groq-hosted `gpt-oss-120b` during
  development), constrained to cited passages. Saved offline answers record the model that wrote them.
- Experiment records, test values and quoted excerpts come from NASA sources and are not generated.

## Limitations

- Findings are AI drafts until reviewed; their severity, actionability, evidence-strength and relevance scores are
  judgments, so rankings may change as findings are verified.
- The corpus is a curated selection of 133 sources, not all of PSI or NTRS.
- Test points come from seven tables; many investigations report only in prose or figures.
- Cabin atmospheres are sourced for the ISS and the lunar surface; Gateway and Mars defaults are marked as assumptions.
- The coverage metric measures distance to tested conditions; it does not predict whether a material will burn.
- The Bengali toggle covers key interface copy only; evidence and answers are English. There is no light theme (the
  chart palettes are validated for the dark surfaces only).
- Narrated briefings use the browser's speech engine; voices and quality depend on the operating system.
- The copilot's relevance gate was calibrated on 15 questions; the embedding model is small and English-only.
- The machine-learning flammability estimate (a stretch goal) was checked against its bar (at least 150 labelled points
  in one material family, validated across experiments) and not shipped: only the liquid-droplet family is large enough,
  and all of it comes from one experiment (FLEX) at 0 g. `/methods` computes these numbers from the data.

## Credits and licences

NASA PSI data is CC0. Instrument Serif and Geist (`src/assets/fonts/`, used for the social and share images) are under
the SIL Open Font License (`src/assets/fonts/OFL.txt`; Geist by Vercel). No NASA insignia or logos are used.
