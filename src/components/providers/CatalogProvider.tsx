"use client";

import { createContext, useContext, useMemo } from "react";
import type { CatalogExperiment, CoreCatalog, CoreSource } from "@/lib/catalog";

type CatalogContextValue = CoreCatalog & {
  sourceById: Map<string, CoreSource>;
  experimentById: Map<string, CatalogExperiment>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

/** Core catalogue shared by every page (chips, labels). Heavier details come from `useFullCatalog`. */
export function CatalogProvider({ catalog, children }: { catalog: CoreCatalog; children: React.ReactNode }) {
  const value = useMemo(
    () => ({
      ...catalog,
      sourceById: new Map(catalog.sources.map((s) => [s.id, s])),
      experimentById: new Map(catalog.experiments.map((e) => [e.id, e])),
    }),
    [catalog],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return ctx;
}
