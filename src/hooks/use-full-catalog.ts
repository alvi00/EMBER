"use client";

import { useEffect, useState } from "react";
import type { Catalog, CatalogSource } from "@/lib/catalog";

export type FullCatalog = Catalog & { sourceById: Map<string, CatalogSource> };

let cache: FullCatalog | null = null;
let pending: Promise<FullCatalog> | null = null;

function load(): Promise<FullCatalog> {
  pending ??= fetch("/api/catalog")
    .then((r) => (r.ok ? (r.json() as Promise<Catalog>) : Promise.reject(new Error(String(r.status)))))
    .then((c) => (cache = { ...c, sourceById: new Map(c.sources.map((s) => [s.id, s])) }))
    .catch((err) => {
      pending = null;
      throw err;
    });
  return pending;
}

/** The full catalogue, fetched once per session on first use (palette search, drawer details). Null while loading. */
export function useFullCatalog(): FullCatalog | null {
  const [data, setData] = useState<FullCatalog | null>(cache);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    load()
      .then((c) => alive && setData(c))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return data ?? cache;
}
