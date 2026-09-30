import type { Experiment, ExperimentCategory, Platform, Range } from "@/lib/schema";

/** Client-safe explorer model: one row per experiment with derived facets and counts. */
export type ExplorerRow = {
  id: string;
  acronym: string;
  fullName: string;
  platform: Platform;
  facility?: string;
  category: ExperimentCategory[];
  start: number;
  end: number;
  fuels: string[];
  fuelGroups: string[];
  facilityGroup: string;
  o2?: Range;
  pressure?: Range;
  flow?: Range;
  summary: string;
  objectives: string;
  hasRawData: boolean;
  verified: boolean;
  kind: Experiment["kind"];
  findings: number;
  verifiedFindings: number;
  testPoints: number;
  sources: number;
};

export const CATEGORY_LABEL: Record<ExperimentCategory, string> = {
  droplet: "Droplets",
  solid: "Solid materials",
  "gaseous-premixed": "Premixed gas",
  "gaseous-nonpremixed": "Gas flames",
  smoke: "Smoke",
  suppression: "Suppression",
  "large-scale": "Large-scale",
};

export const FUEL_GROUPS: { id: string; label: string; test: RegExp }[] = [
  { id: "pmma", label: "PMMA (acrylic)", test: /pmma|acrylic/i },
  { id: "fabric", label: "Fabrics", test: /fabric|sibal|cotton|nomex/i },
  { id: "silicone", label: "Silicone", test: /silicone/i },
  { id: "liquid", label: "Liquid fuels", test: /heptane|methanol|dodecane|decane|octane|ethanol|propanol|alkane|farnesane|isooctane/i },
  { id: "gas", label: "Gaseous fuels", test: /methane|ethylene|hydrogen|propane|butane|ethane|pentane|propylene|dimethyl/i },
  { id: "smoke", label: "Smoke sources", test: /teflon|kapton|lampwick|pyrell|dibutyl|dust|aerosol/i },
];

export const FACILITY_GROUPS: { id: string; label: string; test: (e: { facility?: string; platform: Platform }) => boolean }[] = [
  { id: "cir", label: "Combustion Integrated Rack", test: (e) => /CIR|Combustion Integrated Rack/i.test(e.facility ?? "") },
  { id: "msg", label: "Microgravity Science Glovebox", test: (e) => /MSG|Glovebox/i.test(e.facility ?? "") },
  { id: "cygnus", label: "Cygnus (Saffire)", test: (e) => e.platform === "Cygnus" },
  { id: "partial", label: "Partial-g facilities", test: (e) => e.platform === "Drop tower" || e.platform === "Sounding rocket" },
  { id: "ground", label: "Ground analysis", test: (e) => e.platform === "Ground" },
];

export function facilityGroupOf(e: { facility?: string; platform: Platform }): string {
  return FACILITY_GROUPS.find((g) => g.test(e))?.id ?? "other";
}

export type ExplorerState = {
  q: string;
  cat: string[];
  plat: string[];
  fuel: string[];
  fac: string[];
  yr?: [number, number];
  o2?: [number, number];
  p?: [number, number];
  flow?: [number, number];
  raw: boolean;
  ver: boolean;
  view: "cards" | "table";
  sort: string;
  dir: "asc" | "desc";
};

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);
const pair = (v: string | null): [number, number] | undefined => {
  if (!v) return undefined;
  const [a, b] = v.split("-").map(Number);
  return Number.isFinite(a) && Number.isFinite(b) ? [Math.min(a, b), Math.max(a, b)] : undefined;
};

export function parseExplorerState(p: URLSearchParams): ExplorerState {
  return {
    q: p.get("q") ?? "",
    cat: list(p.get("cat")),
    plat: list(p.get("plat")),
    fuel: list(p.get("fuel")),
    fac: list(p.get("fac")),
    yr: pair(p.get("yr")),
    o2: pair(p.get("o2")),
    p: pair(p.get("p")),
    flow: pair(p.get("flow")),
    raw: p.get("raw") === "1",
    ver: p.get("ver") === "1",
    view: p.get("view") === "table" ? "table" : "cards",
    sort: p.get("sort") ?? "start",
    dir: p.get("dir") === "asc" ? "asc" : "desc",
  };
}

export function serializeExplorerState(s: ExplorerState, keep?: URLSearchParams): string {
  const out = new URLSearchParams();
  const mission = keep?.get("mission");
  if (mission) out.set("mission", mission);
  if (s.q) out.set("q", s.q);
  if (s.cat.length) out.set("cat", s.cat.join(","));
  if (s.plat.length) out.set("plat", s.plat.join(","));
  if (s.fuel.length) out.set("fuel", s.fuel.join(","));
  if (s.fac.length) out.set("fac", s.fac.join(","));
  if (s.yr) out.set("yr", s.yr.join("-"));
  if (s.o2) out.set("o2", s.o2.join("-"));
  if (s.p) out.set("p", s.p.join("-"));
  if (s.flow) out.set("flow", s.flow.join("-"));
  if (s.raw) out.set("raw", "1");
  if (s.ver) out.set("ver", "1");
  if (s.view !== "cards") out.set("view", s.view);
  if (s.sort !== "start") out.set("sort", s.sort);
  if (s.dir !== "desc") out.set("dir", s.dir);
  return out.toString();
}

const overlaps = (r: Range | undefined, want: [number, number] | undefined) =>
  !want || (r !== undefined && r.max >= want[0] && r.min <= want[1]);

/** Apply every facet filter (search ordering is handled separately). */
export function filterRows(rows: ExplorerRow[], s: ExplorerState) {
  let missingDims = 0;
  const out = rows.filter((r) => {
    if (s.cat.length && !r.category.some((c) => s.cat.includes(c))) return false;
    if (s.plat.length && !s.plat.includes(r.platform)) return false;
    if (s.fuel.length && !r.fuelGroups.some((g) => s.fuel.includes(g))) return false;
    if (s.fac.length && !s.fac.includes(r.facilityGroup)) return false;
    if (s.yr && (r.end < s.yr[0] || r.start > s.yr[1])) return false;
    if (s.raw && !r.hasRawData) return false;
    if (s.ver && !r.verified) return false;
    const dimsOk = overlaps(r.o2, s.o2) && overlaps(r.pressure, s.p) && overlaps(r.flow, s.flow);
    if (!dimsOk) {
      if ((s.o2 && !r.o2) || (s.p && !r.pressure) || (s.flow && !r.flow)) missingDims += 1;
      return false;
    }
    return true;
  });
  return { rows: out, missingDims };
}

export function activeFilterCount(s: ExplorerState): number {
  return (
    s.cat.length +
    s.plat.length +
    s.fuel.length +
    s.fac.length +
    (s.yr ? 1 : 0) +
    (s.o2 ? 1 : 0) +
    (s.p ? 1 : 0) +
    (s.flow ? 1 : 0) +
    (s.raw ? 1 : 0) +
    (s.ver ? 1 : 0)
  );
}
