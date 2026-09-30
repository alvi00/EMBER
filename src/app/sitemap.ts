import type { MetadataRoute } from "next";
import { experiments } from "@/lib/data";

const BASE = "http://localhost:3000";
const PAGES = ["", "/dashboard", "/experiments", "/insights", "/lens", "/ask", "/compare", "/methods", "/about"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PAGES.map((p) => ({ url: `${BASE}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 })),
    ...experiments.map((e) => ({ url: `${BASE}/experiments/${e.id}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
