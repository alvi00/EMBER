"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MissionId } from "@/lib/schema";
import { DEFAULT_MISSION } from "@/lib/missions";

/** Last mission the visitor chose; the URL (?mission=) always wins when present. */
export const useMissionStore = create<{ mission: MissionId; setMission: (m: MissionId) => void }>()(
  persist(
    (set) => ({
      mission: DEFAULT_MISSION,
      setMission: (mission) => set({ mission }),
    }),
    { name: "ember-mission", skipHydration: true },
  ),
);

export type DrawerTarget = { sourceId: string; chunkId?: string; page?: number; excerpt?: string };

/** Global SourceDrawer: any CitationChip can open it. */
export const useSourceDrawer = create<{
  target: DrawerTarget | null;
  open: (t: DrawerTarget) => void;
  close: () => void;
}>()((set) => ({
  target: null,
  open: (target) => set({ target }),
  close: () => set({ target: null }),
}));

/** Command palette + mini-ask visibility. */
export const useUiStore = create<{
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  askOpen: boolean;
  askSeed: string;
  openAsk: (seed?: string) => void;
  setAskOpen: (v: boolean) => void;
}>()((set) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  askOpen: false,
  askSeed: "",
  openAsk: (askSeed = "") => set({ askOpen: true, askSeed }),
  setAskOpen: (askOpen) => set({ askOpen }),
}));
