/** Global UI copy for the EMBER shell. Page-specific copy lives next to it in src/content/. */

export const site = {
  name: "EMBER",
  expansion: "Exploration Microgravity Burn Evidence Resource",
  tagline: "Fire-safety evidence from NASA microgravity combustion research, ranked for your mission.",
  description:
    "EMBER summarizes, ranks and interprets NASA microgravity combustion findings into traceable fire-safety insights for the ISS, Gateway, the Moon and Mars.",
  disclaimer:
    "Not an official NASA product. Research exploration tool — not for operational safety decisions.",
  provenance:
    "Evidence drawn from NASA Physical Sciences Informatics (PSI) and the NASA Technical Reports Server (NTRS). Every finding links to its source.",
  challenge: "NASA Space Apps Challenge 2026 · Flame in Freefall",
} as const;

export type NavItem = { href: string; label: string; short?: string };

export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Mission Control", short: "Dashboard" },
  { href: "/experiments", label: "Experiments" },
  { href: "/insights", label: "Insights" },
  { href: "/lens", label: "Risk Lens" },
  { href: "/ask", label: "Ask the Flame", short: "Ask" },
  { href: "/methods", label: "Methods" },
];

export const footerNav: NavItem[] = [
  ...primaryNav,
  { href: "/compare", label: "Compare" },
  { href: "/about", label: "About" },
];
