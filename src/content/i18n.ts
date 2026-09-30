import { site } from "@/content/site";

/**
 * Key UI copy in English and Bengali (project.md Phase 11 stretch: "Bengali (bn) toggle for key UI copy").
 * Only the shell, the hero and page headers are translated. Findings, excerpts, source titles and answers stay in
 * English so every quoted word remains verbatim and traceable to its NASA source.
 */
export type Locale = "en" | "bn";

const en = {
  "nav.home": "Home",
  "nav.dashboard": "Mission Control",
  "nav.dashboard.short": "Dashboard",
  "nav.experiments": "Experiments",
  "nav.insights": "Insights",
  "nav.lens": "Risk Lens",
  "nav.ask": "Ask the Flame",
  "nav.ask.short": "Ask",
  "nav.methods": "Methods",
  "nav.compare": "Compare",
  "nav.about": "About",
  "hero.line1": "On Earth, fire rises.",
  "hero.line2": "In space, it has nowhere to go.",
  "hero.lead":
    "EMBER turns decades of NASA microgravity combustion research into ranked, source-linked fire-safety insights for the Moon and Mars.",
  "hero.cta.dashboard": "Open Mission Control",
  "hero.cta.ask": "Ask the Flame",
  "page.dashboard.title": "Mission Control",
  "page.dashboard.lead":
    "The state of NASA fire-safety evidence for one mission at a time, every number traceable to a source.",
  "page.experiments.title": "Experiments",
  "page.experiments.lead":
    "{n} NASA investigations, from droplets on the ISS to metre-long fires inside Cygnus. Search reads their source documents too.",
  "page.insights.title": "Ranked insights",
  "page.insights.lead":
    "Every finding scored by the same visible formula. Move the weights and watch the ranking change; open any source to check it.",
  "page.lens.title": "Habitat Risk Lens",
  "page.lens.lead":
    "Set your cabin's gravity, oxygen, pressure and airflow. The Lens shows which NASA tests are closest, and where the evidence runs out.",
  "page.ask.title": "Ask the Flame",
  "page.ask.lead":
    "Questions answered only from NASA microgravity combustion records. Every claim cites its passage, and when the data is silent EMBER says so.",
  "disclaimer.site": site.disclaimer,
  "disclaimer.lens": "Research exploration tool. Not for operational safety decisions.",
} as const;

export type UiKey = keyof typeof en;

const bn: Record<UiKey, string> = {
  "nav.home": "প্রথম পাতা",
  "nav.dashboard": "মিশন কন্ট্রোল",
  "nav.dashboard.short": "ড্যাশবোর্ড",
  "nav.experiments": "পরীক্ষাসমূহ",
  "nav.insights": "অন্তর্দৃষ্টি",
  "nav.lens": "ঝুঁকি লেন্স",
  "nav.ask": "শিখাকে জিজ্ঞাসা",
  "nav.ask.short": "জিজ্ঞাসা",
  "nav.methods": "পদ্ধতি",
  "nav.compare": "তুলনা",
  "nav.about": "পরিচিতি",
  "hero.line1": "পৃথিবীতে আগুন ওপরে ওঠে।",
  "hero.line2": "মহাকাশে তার যাওয়ার কোনো জায়গা নেই।",
  "hero.lead":
    "EMBER নাসার কয়েক দশকের মাইক্রোগ্র্যাভিটি দহন গবেষণাকে চাঁদ ও মঙ্গলের জন্য র‍্যাঙ্ক করা, উৎস-সংযুক্ত অগ্নি-নিরাপত্তা অন্তর্দৃষ্টিতে রূপ দেয়।",
  "hero.cta.dashboard": "মিশন কন্ট্রোল খুলুন",
  "hero.cta.ask": "শিখাকে জিজ্ঞাসা করুন",
  "page.dashboard.title": "মিশন কন্ট্রোল",
  "page.dashboard.lead":
    "একবারে একটি মিশনের জন্য নাসার অগ্নি-নিরাপত্তা প্রমাণের অবস্থা; প্রতিটি সংখ্যা তার উৎস পর্যন্ত যাচাই করা যায়।",
  "page.experiments.title": "পরীক্ষাসমূহ",
  "page.experiments.lead":
    "নাসার {n}টি গবেষণা, আইএসএসে জ্বালানির ফোঁটা থেকে সিগনাসের ভেতরে এক মিটার লম্বা আগুন পর্যন্ত। অনুসন্ধান তাদের মূল নথিও পড়ে।",
  "page.insights.title": "র‍্যাঙ্ক করা অন্তর্দৃষ্টি",
  "page.insights.lead":
    "প্রতিটি ফলাফল একই দৃশ্যমান সূত্রে স্কোর করা। ওজন বদলান, র‍্যাঙ্কিং বদলাতে দেখুন; যাচাই করতে যেকোনো উৎস খুলুন।",
  "page.lens.title": "আবাসস্থল ঝুঁকি লেন্স",
  "page.lens.lead":
    "আপনার কেবিনের মাধ্যাকর্ষণ, অক্সিজেন, চাপ ও বায়ুপ্রবাহ ঠিক করুন। লেন্স দেখায় নাসার কোন পরীক্ষাগুলো সবচেয়ে কাছাকাছি, আর কোথায় প্রমাণ ফুরিয়ে যায়।",
  "page.ask.title": "শিখাকে জিজ্ঞাসা",
  "page.ask.lead":
    "উত্তর দেওয়া হয় কেবল নাসার মাইক্রোগ্র্যাভিটি দহন রেকর্ড থেকে। প্রতিটি দাবি তার অনুচ্ছেদ উদ্ধৃত করে, আর তথ্য না থাকলে EMBER তা স্পষ্ট বলে।",
  "disclaimer.site":
    "নাসার দাপ্তরিক পণ্য নয়। এটি একটি গবেষণা-অনুসন্ধান টুল, পরিচালনাগত নিরাপত্তা সিদ্ধান্তের জন্য নয়।",
  "disclaimer.lens": "গবেষণা-অনুসন্ধান টুল। পরিচালনাগত নিরাপত্তা সিদ্ধান্তের জন্য নয়।",
};

export const UI: Record<Locale, Record<UiKey, string>> = { en, bn };

/** Nav label keys by route, for the header, mobile menu and footer. */
export const NAV_KEY: Record<string, { label: UiKey; short?: UiKey }> = {
  "/": { label: "nav.home" },
  "/dashboard": { label: "nav.dashboard", short: "nav.dashboard.short" },
  "/experiments": { label: "nav.experiments" },
  "/insights": { label: "nav.insights" },
  "/lens": { label: "nav.lens" },
  "/ask": { label: "nav.ask", short: "nav.ask.short" },
  "/methods": { label: "nav.methods" },
  "/compare": { label: "nav.compare" },
  "/about": { label: "nav.about" },
};

export function translate(locale: Locale, key: UiKey, vars?: Record<string, string | number>): string {
  const text = UI[locale][key];
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;
}
