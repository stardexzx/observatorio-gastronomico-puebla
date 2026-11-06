"use client";

import { FileSearch, SearchX } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { useDashboard } from "./dashboard-context";

export function SearchResults() {
  const { search, setSearch, navigateTo, view } = useDashboard();
  if (!search.trim()) return null;
  return <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
    {view.searchResults.length ? <div className="p-2"><p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Resultados</p>{view.searchResults.map((result) => <button key={`${result.detail}-${result.label}`} onClick={() => { navigateTo(result.section); setSearch(""); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#e8f2f7] text-[#174f78]"><FileSearch className="size-4"/></span><span className="min-w-0"><strong className="block truncate text-sm text-slate-700">{result.label}</strong><span className="block text-xs text-slate-400">{result.detail}</span></span></button>)}</div> : <Empty className="min-h-44 border-0 p-5"><EmptyHeader><EmptyMedia variant="icon"><SearchX/></EmptyMedia><EmptyTitle className="text-base">Sin resultados</EmptyTitle><EmptyDescription>No encontramos coincidencias para “{search}”.</EmptyDescription></EmptyHeader></Empty>}
  </div>;
}
