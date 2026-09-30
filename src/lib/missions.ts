import type { MissionId } from "@/lib/schema";

/**
 * Mission profiles (project.md §9.4). Gravity values are physical constants. Cabin pressure / O2 defaults are only
 * marked `sourced` when a collected NASA source states them; otherwise they are labelled "assumed" and editable in
 * the Risk Lens.
 */
export type CabinDefault = {
  pressureKpa: number;
  o2Percent: number;
  flowCmS: number;
  sourced: boolean;
  sourceId?: string;
  note: string;
};

export type Mission = {
  id: MissionId;
  label: string;
  short: string;
  gravityG: number;
  gravityLabel: string;
  description: string;
  cabin: CabinDefault;
};

export const MISSIONS: Mission[] = [
  {
    id: "iss",
    label: "ISS",
    short: "ISS",
    gravityG: 0,
    gravityLabel: "0 g (microgravity)",
    description: "Low Earth orbit station with a sea-level air atmosphere.",
    cabin: {
      pressureKpa: 101.3,
      o2Percent: 22,
      flowCmS: 20,
      sourced: true,
      sourceId: "ntrs-20205004657",
      note: "ISS ambient 1.0 atm and ~22% O2 (21.3-22.9% daily range) per NTRS 20205004657. Flow 20 cm/s is the Saffire test speed, not a vehicle requirement.",
    },
  },
  {
    id: "gateway",
    label: "Gateway",
    short: "Gateway",
    gravityG: 0,
    gravityLabel: "0 g (lunar orbit)",
    description: "Small crewed station in lunar orbit; long quiet periods between crews.",
    cabin: {
      pressureKpa: 101.3,
      o2Percent: 21,
      flowCmS: 20,
      sourced: false,
      note: "Assumed sea-level air. No Gateway cabin atmosphere is stated in the collected sources.",
    },
  },
  {
    id: "lunar",
    label: "Lunar surface",
    short: "Moon",
    gravityG: 0.166,
    gravityLabel: "0.17 g",
    description: "Landers and surface habitats at one-sixth gravity with an exploration atmosphere.",
    cabin: {
      pressureKpa: 56.5,
      o2Percent: 34,
      flowCmS: 20,
      sourced: true,
      sourceId: "ntrs-20260002050",
      note: "Artemis sustained-mission target of 8.2 psi (56.5 kPa) and 34% O2 per NTRS 20260002050 (an alternative below 30% O2, 66.2 kPa / 28.5%, has also been tested).",
    },
  },
  {
    id: "marsTransit",
    label: "Mars transit",
    short: "Transit",
    gravityG: 0,
    gravityLabel: "0 g (deep space)",
    description: "Months-long cruise in weightlessness, far from resupply or rescue.",
    cabin: {
      pressureKpa: 101.3,
      o2Percent: 21,
      flowCmS: 20,
      sourced: false,
      note: "Assumed sea-level air. No Mars transit cabin atmosphere is stated in the collected sources.",
    },
  },
  {
    id: "marsSurface",
    label: "Mars surface",
    short: "Mars",
    gravityG: 0.38,
    gravityLabel: "0.38 g",
    description: "Surface habitats at about one-third Earth gravity.",
    cabin: {
      pressureKpa: 56.5,
      o2Percent: 34,
      flowCmS: 20,
      sourced: false,
      note: "Assumed to follow the Artemis exploration atmosphere (56.5 kPa, 34% O2); no Mars habitat atmosphere is stated in the collected sources.",
    },
  },
];

export const DEFAULT_MISSION: MissionId = "lunar";

export function getMission(id: string | null | undefined): Mission {
  return MISSIONS.find((m) => m.id === id) ?? MISSIONS.find((m) => m.id === DEFAULT_MISSION)!;
}

export function isMissionId(id: string | null | undefined): id is MissionId {
  return MISSIONS.some((m) => m.id === id);
}
