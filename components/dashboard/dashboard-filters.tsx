"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronDown, FileDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useDashboard } from "./dashboard-context";
import { pueblaMunicipalities } from "@/data/puebla-municipalities";

const periods = [
  { value: "2023-2024", label: "Todo el periodo", dates: "01 ene 2023 – 31 may 2024", compact: "Ene 2023 – May 2024" },
  { value: "2024", label: "2024", dates: "01 ene 2024 – 31 may 2024", compact: "Ene – May 2024" },
  { value: "2023", label: "2023", dates: "01 ene 2023 – 31 dic 2023", compact: "Ene – Dic 2023" },
] as const;
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX").trim();

export function DashboardFilters({ onGenerate }: { onGenerate: () => void }) {
  const { filters, setFilter, resetFilters } = useDashboard();
  const [periodOpen, setPeriodOpen] = useState(false);
  const [municipalityOpen, setMunicipalityOpen] = useState(false);
  const [municipalitySearch, setMunicipalitySearch] = useState("");
  const activeCount = Number(filters.municipality !== "todos") + Number(filters.category !== "todas");
  const hasFilters = activeCount > 0 || filters.period !== "2023-2024";
  const periodLabel = periods.find(period => period.value === filters.period)!.compact;
  const municipalityMatches = pueblaMunicipalities.filter(item => normalize(`${item.name} ${item.code}`).includes(normalize(municipalitySearch))).length;
  const municipalityLabel = pueblaMunicipalities.find(item => item.code === filters.municipality)?.name ?? "Todos los municipios";

  return <div className="dashboard-toolbar" role="group" aria-label="Filtros del dashboard">
    <Popover open={periodOpen} onOpenChange={setPeriodOpen}><PopoverTrigger asChild><button type="button" aria-label={`Periodo: ${periodLabel}`} className="toolbar-control toolbar-period"><CalendarDays className="size-3.5"/><span>{periodLabel}</span><ChevronDown className="size-3"/></button></PopoverTrigger><PopoverContent align="end" sideOffset={10} className="period-menu w-[min(290px,calc(100vw-32px))] rounded-xl p-2">
      <h2 className="px-3 pb-2 pt-2 text-[11px] font-semibold text-[#748399]">Periodo de consulta</h2>
      <div role="group" aria-label="Seleccionar periodo">{periods.map(period => <button key={period.value} type="button" aria-pressed={period.value === filters.period} onClick={() => {setFilter("period", period.value);setPeriodOpen(false);}} className={`period-option ${period.value === filters.period ? "is-selected" : ""}`}><span><strong>{period.label}</strong><small>{period.dates}</small></span>{period.value === filters.period && <Check className="size-4 shrink-0 text-[#1684a5]"/>}</button>)}</div>
    </PopoverContent></Popover>
    <Popover><PopoverTrigger asChild><button type="button" className={`toolbar-control ${activeCount ? "has-filters" : ""}`} aria-label={activeCount ? `Filtros, ${activeCount} ${activeCount === 1 ? "activo" : "activos"}` : "Filtros"}><SlidersHorizontal className="size-3.5"/>Filtros{activeCount > 0 && <span className="toolbar-count">{activeCount}</span>}</button></PopoverTrigger><PopoverContent align="end" sideOffset={10} className="w-[min(320px,calc(100vw-32px))] rounded-xl p-4">
      <div className="mb-5 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Filtrar registros</h2>{hasFilters && <button type="button" onClick={resetFilters} className="flex items-center gap-1.5 text-[11px] text-[#1684a5] hover:underline"><RotateCcw className="size-3"/>Restablecer</button>}</div>
      <div className="space-y-4">
        <div><label id="municipality-filter-label" className="mb-2 block text-xs font-medium text-[#748399]">Municipio</label>
          <Popover open={municipalityOpen} onOpenChange={open => {setMunicipalityOpen(open);if(!open)setMunicipalitySearch("");}}><PopoverTrigger asChild><button type="button" aria-expanded={municipalityOpen} aria-labelledby="municipality-filter-label" title={municipalityLabel} className="municipality-trigger"><span>{municipalityLabel}</span><ChevronDown className="size-3.5 shrink-0 text-[#8190a4]"/></button></PopoverTrigger><PopoverContent align="start" sideOffset={6} className="municipality-menu w-[var(--radix-popover-trigger-width)] rounded-xl p-0">
            <Command filter={(value, search) => normalize(value).includes(normalize(search)) ? 1 : 0}>
              <CommandInput aria-label="Buscar municipio" placeholder="Buscar municipio…" value={municipalitySearch} onValueChange={setMunicipalitySearch}/>
              <CommandList id="municipality-results" className="max-h-[200px] overscroll-contain"><CommandEmpty>No encontramos ese municipio.</CommandEmpty><CommandGroup>
                <CommandItem value="Todos los municipios" onSelect={() => {setFilter("municipality","todos");setMunicipalityOpen(false);setMunicipalitySearch("");}}><span className="flex-1">Todos los municipios</span>{filters.municipality === "todos" && <Check className="size-3.5"/>}</CommandItem>
                {pueblaMunicipalities.map(municipality => <CommandItem key={municipality.code} value={`${municipality.name} ${municipality.code}`} onSelect={() => {setFilter("municipality", municipality.code);setMunicipalityOpen(false);setMunicipalitySearch("");}}><span className="flex-1">{municipality.name}</span>{filters.municipality === municipality.code && <Check className="size-3.5"/>}</CommandItem>)}
              </CommandGroup></CommandList>
              <div className="border-t px-3 py-2 text-[10px] text-[#8190a4]">{municipalitySearch.trim() ? `${municipalityMatches} ${municipalityMatches === 1 ? "municipio encontrado" : "municipios encontrados"}` : "217 municipios · Escribe para buscar"}</div>
            </Command>
          </PopoverContent></Popover>
        </div>
        <div><label id="category-filter-label" className="mb-2 block text-xs font-medium text-[#748399]">Categoría</label><Select value={filters.category} onValueChange={value => setFilter("category", value as typeof filters.category)}><SelectTrigger aria-label="Categoría" aria-labelledby="category-filter-label" className="w-full text-xs"><SelectValue/></SelectTrigger><SelectContent>
          <SelectItem value="todas">Todas las categorías</SelectItem><SelectItem value="recetas">Recetas</SelectItem><SelectItem value="ingredientes">Ingredientes</SelectItem><SelectItem value="mercados">Mercados</SelectItem><SelectItem value="cocineras">Cocineras/os</SelectItem><SelectItem value="legal">Protección legal</SelectItem>
        </SelectContent></Select></div>
      </div>
      <p className="mt-4 border-t pt-3 text-[10px] leading-relaxed text-[#8190a4]">Los resultados se actualizan al seleccionar un filtro.</p>
    </PopoverContent></Popover>
    <button type="button" onClick={onGenerate} className="toolbar-control toolbar-report"><FileDown className="size-3.5"/>Generar reporte</button>
  </div>;
}
