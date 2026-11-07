"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePublicCatalog } from "@/components/public/public-catalog-provider";
import { buildPublicDashboardView, publicSummaryYears, defaultSummaryFilters, normalizeSummaryFilters, summaryMapMunicipalityCounts } from "@/lib/public-dashboard";
import { type CategoryFilter, type DashboardFilters, type MunicipalityFilter } from "@/lib/dashboard-view";

type DashboardContextValue = {
  filters: DashboardFilters;
  setFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  resetFilters: () => void;
  selectMunicipality: (value: MunicipalityFilter) => void;
  selectCategory: (value: CategoryFilter) => void;
  search: string;
  setSearch: (value: string) => void;
  isLoading: boolean;
  activeSection: string;
  navigateTo: (section: string) => void;
  view: ReturnType<typeof buildPublicDashboardView>;
  years: string[];
  error: string;
  reload: () => void;
  allDistribution: ReturnType<typeof buildPublicDashboardView>["distribution"];
  municipalityCounts: Record<string, number>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const catalog = usePublicCatalog();
  const initialFilters = defaultSummaryFilters;
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const [search, setSearch] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("resumen");

  useEffect(() => {
    let live = true;
    Promise.resolve().then(() => {
      if (!live) return;
      try {
        // One preference set for the shared published summary, independent of identity.
        const saved = window.localStorage.getItem("observatorio-summary-filters");
        if (saved) setFilters(normalizeSummaryFilters(JSON.parse(saved)));
      } catch { /* A blocked filter preference must not prevent access to the panel. */ }
      setHydrated(true);
    });
    return () => {live=false;};
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {window.localStorage.setItem("observatorio-summary-filters", JSON.stringify(filters));}
    catch { /* Filters remain usable in memory when storage is unavailable. */ }
  }, [filters,hydrated]);

  const triggerLoading = useCallback(() => {
    setIsLoading(true);
    window.setTimeout(() => setIsLoading(false), 320);
  }, []);

  const setFilter = useCallback(<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value })); triggerLoading();
  }, [triggerLoading]);
  const resetFilters = useCallback(() => { setFilters(defaultSummaryFilters); triggerLoading(); }, [triggerLoading]);
  const navigateTo = useCallback((section: string) => {
    setActiveSection(section);
    window.requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);
  const selectMunicipality = useCallback((value: MunicipalityFilter) => { setFilter("municipality", value); navigateTo("distribucion"); }, [navigateTo, setFilter]);
  const selectCategory = useCallback((value: CategoryFilter) => { setFilter("category", value); navigateTo(value === "todas" ? "resumen" : "distribucion"); }, [navigateTo, setFilter]);
  const view = useMemo(() => buildPublicDashboardView(catalog, filters, search), [catalog, filters, search]);
  const years = publicSummaryYears(catalog);
  const municipalityCounts = useMemo(() => summaryMapMunicipalityCounts(catalog,filters),[catalog,filters]);

  return <DashboardContext.Provider value={{ filters, setFilter, resetFilters, selectMunicipality, selectCategory, search, setSearch, isLoading: isLoading || catalog.loading, activeSection, navigateTo, view, years, error: catalog.error, reload: catalog.reload, allDistribution: view.allDistribution, municipalityCounts }}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard debe utilizarse dentro de DashboardProvider");
  return context;
}
