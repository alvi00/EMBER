"use client";

import { createContext, useContext, useMemo } from "react";
import type { Catalog, CatalogExperiment, CatalogSource } from "@/lib/catalog";

type CatalogContextValue = Catalog & {
  sourceById: Map<string, CatalogSource>;
  experimentById: Map<string, CatalogExperiment>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: React.ReactNode }) {
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
