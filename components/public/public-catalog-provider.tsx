"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { RecipeRecord } from "@/data/recipes";
import type { CookRecord } from "@/data/cooks";
import type { IngredientRecord } from "@/data/ingredients";
import type { Episode } from "@/data/podcasts";
import { timelineEras } from "@/src/data/timeline.js";

export type PublicCatalog = {
  recipes: RecipeRecord[];
  cooks: CookRecord[];
  ingredients: IngredientRecord[];
  episodes: Episode[];
  markets: Record<string, unknown>[];
  timeline: typeof timelineEras;
  relations: { source: string; target: string; type: string }[];
};
const emptyCatalog: PublicCatalog = { recipes: [], cooks: [], ingredients: [], episodes: [], markets: [], timeline: [], relations: [] };
type CatalogContext = PublicCatalog & { loading: boolean; error: string; reload: () => void };
const Context = createContext<CatalogContext>({ ...emptyCatalog, loading: true, error: "", reload: () => {} });

export function PublicCatalogProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    setAttempt(value => value + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if(controller.signal.aborted)return;
      setLoading(true);
      setError("");
      return fetch("/api/public/catalog", { cache: "no-store", signal: controller.signal });
    })
      .then(async response => {
        if(!response||controller.signal.aborted)return;
        if (!response.ok) throw new Error("No pudimos cargar la información del observatorio. Inténtalo de nuevo.");
        const body = await response.json() as PublicCatalog;
        if (!["recipes", "cooks", "ingredients", "episodes", "timeline"].every(key => Array.isArray(body[key as keyof PublicCatalog]))) throw new Error("No pudimos cargar el catálogo.");
        setCatalog({ ...emptyCatalog, ...body });
      })
      .catch(error => { if (!controller.signal.aborted) { setCatalog(emptyCatalog); setError(error.message); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt, pathname]);
  useEffect(() => {
    const refresh = () => { if(document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange",refresh);
    return () => document.removeEventListener("visibilitychange",refresh);
  },[reload]);
  return <Context.Provider value={{ ...catalog, loading, error, reload }}>{children}</Context.Provider>;
}

export const usePublicCatalog = () => useContext(Context);
