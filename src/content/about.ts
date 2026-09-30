/**
 * /about copy. Team names are filled in by the team before submission: add one entry per member.
 * Leave `team` empty to show the placeholder card.
 */
export type TeamMember = { name: string; role: string; link?: string };

export const team: TeamMember[] = [];

export const challenge = {
  name: "Flame in Freefall",
  event: "NASA Space Apps Challenge 2026",
  statement:
    "NASA has studied how flames behave in microgravity for decades and has accumulated a large body of experimental results. As crews head back to the Moon and on to Mars, that knowledge matters more than ever, but its volume makes it hard to find, compare and understand. The challenge: build an interactive, AI-powered dashboard that summarizes, ranks and interprets these findings to deliver fire-safety insights for human space exploration.",
};

export const verbs = [
  { verb: "Summarize", what: "Plain-language summaries for every investigation and a cited evidence digest per mission.", href: "/dashboard", cta: "Mission Control" },
  { verb: "Rank", what: "A transparent insight score, re-ranked for each mission, with weights you can change.", href: "/insights", cta: "Insights" },
  { verb: "Interpret", what: "A coverage check for your cabin conditions and a copilot that answers only from cited passages.", href: "/lens", cta: "Risk Lens" },
];

export const credits: { group: string; items: { name: string; note: string; href: string }[] }[] = [
  {
    group: "Data",
    items: [
      { name: "NASA Physical Sciences Informatics", note: "Investigation records, documents and experimental tables (CC0)", href: "https://psi.nasa.gov" },
      { name: "NASA Technical Reports Server", note: "Reports, papers and presentations", href: "https://ntrs.nasa.gov" },
    ],
  },
  {
    group: "Models",
    items: [
      { name: "all-MiniLM-L6-v2", note: "Sentence embeddings, run locally with transformers.js", href: "https://huggingface.co/Xenova/all-MiniLM-L6-v2" },
      { name: "gpt-oss-120b on Groq", note: "Ask the Flame answers and mission digests", href: "https://console.groq.com/docs/models" },
    ],
  },
  {
    group: "Software",
    items: [
      { name: "Next.js and React", note: "Application framework", href: "https://nextjs.org" },
      { name: "Tailwind CSS, shadcn/ui, Magic UI", note: "Styling and components", href: "https://ui.shadcn.com" },
      { name: "GSAP", note: "Scroll choreography", href: "https://gsap.com" },
      { name: "three.js and React Three Fiber", note: "The interactive flame", href: "https://threejs.org" },
      { name: "D3", note: "Chart scales", href: "https://d3js.org" },
      { name: "MiniSearch", note: "Keyword search", href: "https://lucaong.github.io/minisearch/" },
      { name: "Vercel AI SDK", note: "Model provider switch and streaming", href: "https://ai-sdk.dev" },
      { name: "PyMuPDF", note: "PDF text extraction", href: "https://pymupdf.readthedocs.io" },
      { name: "Geist and Instrument Serif", note: "Typefaces", href: "https://vercel.com/font" },
    ],
  },
];
