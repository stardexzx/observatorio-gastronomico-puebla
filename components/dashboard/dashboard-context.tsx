"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildDashboardView, defaultFilters, type CategoryFilter, type DashboardFilters, type MunicipalityFilter } from "@/lib/dashboard-view";

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
  view: ReturnType<typeof buildDashboardView>;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [search, setSearch] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("resumen");

  useEffect(() => {
    let live = true;
    Promise.resolve().then(() => {
      if (!live) return;
      try {
        const saved = window.localStorage.getItem("observatorio-filters");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const legacyMunicipalities: Record<string,string> = {puebla:"21114",atlixco:"21019",tehuacan:"21156",cholula:"21119",zacatlan:"21208",huauchinango:"21071",teziutlan:"21174",izucar:"21085",acatlan:"21003"};
            if (legacyMunicipalities[parsed.municipality]) parsed.municipality = legacyMunicipalities[parsed.municipality];
            setFilters({...defaultFilters,...parsed});
          }
        }
      } catch { /* A blocked filter preference must not prevent access to the panel. */ }
      setHydrated(true);
    });
    return () => {live=false;};
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {window.localStorage.setItem("observatorio-filters", JSON.stringify(filters));}
    catch { /* Filters remain usable in memory when storage is unavailable. */ }
  }, [filters,hydrated]);

  const triggerLoading = useCallback(() => {
    setIsLoading(true);
    window.setTimeout(() => setIsLoading(false), 320);
  }, []);

  const setFilter = useCallback(<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value })); triggerLoading();
  }, [triggerLoading]);
  const resetFilters = useCallback(() => { setFilters(defaultFilters); triggerLoading(); }, [triggerLoading]);
  const navigateTo = useCallback((section: string) => {
    setActiveSection(section);
    window.requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);
  const selectMunicipality = useCallback((value: MunicipalityFilter) => { setFilter("municipality", value); navigateTo("distribucion"); }, [navigateTo, setFilter]);
  const selectCategory = useCallback((value: CategoryFilter) => { setFilter("category", value); navigateTo(value === "todas" ? "resumen" : "distribucion"); }, [navigateTo, setFilter]);
  const view = useMemo(() => buildDashboardView(filters, search), [filters, search]);

  return <DashboardContext.Provider value={{ filters, setFilter, resetFilters, selectMunicipality, selectCategory, search, setSearch, isLoading, activeSection, navigateTo, view }}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard debe utilizarse dentro de DashboardProvider");
  return context;
}
