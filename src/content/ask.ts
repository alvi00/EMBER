import type { MissionId } from "@/lib/schema";

/**
 * Suggested questions for Ask the Flame. Each is tagged with the mission it was written for; the precompute script
 * (scripts/ts/precompute-answers.ts) stores a cited answer for each so they work offline.
 */
export const SUGGESTED_QUESTIONS: { question: string; mission: MissionId }[] = [
  { question: "Does lunar gravity make materials more flammable?", mission: "lunar" },
  { question: "Does turning off ventilation put out a fire in microgravity?", mission: "iss" },
  { question: "What happens to smoke detection in a small spacecraft?", mission: "gateway" },
  { question: "How does oxygen concentration change flame spread over thin fuels?", mission: "lunar" },
  { question: "What did the Saffire experiments learn from large fires in orbit?", mission: "gateway" },
  { question: "Are cool flames a hazard in spacecraft?", mission: "marsTransit" },
  { question: "How does lower cabin pressure affect how materials burn?", mission: "lunar" },
  { question: "How do droplet flames burn differently without gravity?", mission: "iss" },
  { question: "Does the standard 1-g flammability test predict burning in microgravity?", mission: "marsTransit" },
  { question: "What does confinement in a narrow space do to a flame?", mission: "gateway" },
  { question: "How do diluent gases like carbon dioxide or helium affect extinction?", mission: "iss" },
  { question: "What is known about fire behaviour in Mars gravity?", mission: "marsSurface" },
];

/** Questions the copilot must decline (Phase 9 checkpoint and the demo's honesty moment). */
export const OUT_OF_SCOPE_CHECKS: string[] = [
  "Who won the 2022 FIFA World Cup?",
  "How do I bake a chocolate cake?",
  "What is the boiling point of water on Mars?",
  "When will Starship land people on Mars?",
  "How do I file my income taxes?",
];

export const askCopy = {
  disclaimer:
    "Answers are generated only from NASA microgravity combustion records and cite every claim. A research exploration tool, not operational safety guidance.",
  offline: "Offline mode",
  offlineHelp:
    "No AI model is connected, so EMBER answers from saved answers or shows the most relevant NASA passages directly.",
  refusal: "Outside the evidence",
  placeholder: "Ask about flammability, flame spread, smoke, suppression…",
};
