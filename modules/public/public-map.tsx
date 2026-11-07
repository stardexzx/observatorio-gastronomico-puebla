"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, BookOpen, ChefHat, Layers3, MapPin, RotateCcw, Search, Wheat, X } from "lucide-react";
import { usePublicCatalog } from "@/components/public/public-catalog-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pueblaMunicipalities } from "@/data/puebla-municipalities";
import MunicipalMap from "@/src/components/map/MunicipalMap.jsx";
import "./public-map.css";

type GeoFeature = { geometry: { type: string; coordinates: unknown[] }; properties: { cvegeo?: string; nomgeo?: string; code?: string; name?: string } };
type GeoCollection = { features: GeoFeature[] };
const layers = [
  { key: "recetas", label: "Recetas", icon: BookOpen, color: "#C1531E" },
  { key: "ingredientes", label: "Ingredientes", icon: Wheat, color: "#4F7A4A" },
  { key: "cocineras", label: "Cocineras y cocineros", icon: ChefHat, color: "#10284C" },
];
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX");
const municipalityFor = (record: { municipalityCode: string; municipality: string }) => pueblaMunicipalities.find(item => item.code === record.municipalityCode || normalize(item.name) === normalize(record.municipality))?.code || "";

export function PublicMap() {
  const { recipes, cooks, ingredients, loading, error, reload } = usePublicCatalog();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = params.get("q") || "";
  const municipality = params.get("municipio") || "";
  const layerParam = params.get("tipos");
  const activeLayers = useMemo(() => layerParam === null ? layers.map(item => item.key) : layerParam.split(","), [layerParam]);
  const [draft, setDraft] = useState(query);
  const [geometry, setGeometry] = useState<GeoCollection | null>(null);
  const [geometryError, setGeometryError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; fetch("/maps/puebla-municipios.geojson").then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(data => { if (active) setGeometry(data as GeoCollection); }).catch(() => { if (active) setGeometryError(true); }); return () => { active = false; }; }, [attempt]);
  const change = (name: string, value: string) => { const next = new URLSearchParams(params); if (value || name === "tipos") next.set(name, value); else next.delete(name); router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }); };
  const all = useMemo(() => [
    ...recipes.map(record => ({ id: record.id, name: record.name, description: record.description, municipality: record.municipality, code: municipalityFor(record), type: "recetas", href: `/recetas/${encodeURIComponent(record.id)}` })),
    ...ingredients.map(record => ({ id: record.id, name: record.name, description: record.description, municipality: record.municipality, code: municipalityFor(record), type: "ingredientes", href: `/ingredientes/${encodeURIComponent(record.id)}` })),
    ...cooks.map(record => ({ id: record.id, name: record.name, description: record.biography, municipality: record.municipality, code: municipalityFor(record), type: "cocineras", href: `/cocineras/${encodeURIComponent(record.id)}` })),
  ], [recipes, ingredients, cooks]);
  const matching = useMemo(() => all.filter(record => activeLayers.includes(record.type) && normalize(`${record.name} ${record.description} ${record.municipality}`).includes(normalize(query))), [all, activeLayers, query]);
  const results = matching.filter(record => !municipality || record.code === municipality);
  const data = useMemo(() => geometry && { features: geometry.features.map(feature => { const code = String(feature.properties.cvegeo || feature.properties.code || ""); return { ...feature, id: code, properties: { code, name: feature.properties.nomgeo || feature.properties.name || "", total: matching.filter(record => record.code === code).length } }; }), points: [], mapped: matching.filter(record => record.code).length }, [geometry, matching]);
  const selected = pueblaMunicipalities.find(item => item.code === municipality);
  return <div className="public-map">
    <header className="mb-7"><p className="section-kicker mb-2">Territorio y patrimonio</p><h1 className="text-[32px] font-semibold tracking-tight text-[#001B62]">Mapa gastronómico de Puebla</h1><p className="mt-2 text-sm text-[#8190a4]">Explora el acervo publicado y sus vínculos con los municipios de Puebla.</p></header>
    <form role="search" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4" onSubmit={event => { event.preventDefault(); change("q", draft); }}>
      <div className="relative min-w-0 flex-1 basis-64"><Search className="absolute left-3 top-3 size-4 text-[#8190a4]"/><Input type="search" aria-label="Buscar en el mapa" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Buscar una receta, ingrediente o persona…" maxLength={200} className="h-10 rounded-lg bg-[#f8fafc] pl-10"/></div>
      <Button type="submit" className="h-10 rounded-lg bg-[#033AA5] text-white hover:bg-[#001B62]"><Search className="size-4"/>Buscar</Button>
      <Button type="button" variant="outline" className="h-10 rounded-lg text-[#52647d]" onClick={() => { setDraft(""); router.replace(pathname, { scroll: false }); }}><RotateCcw className="size-4"/>Limpiar filtros</Button>
    </form>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 rounded-xl border bg-white p-4 sm:p-5" aria-label="Mapa municipal">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 className="flex items-center gap-2 text-sm font-semibold text-[#001B62]"><Layers3 className="size-4 text-[#1684a5]"/>Capas del acervo</h2><span className="text-xs text-[#8190a4]">217 municipios</span></div>
        <div className="mb-5 flex flex-wrap gap-2">{layers.map(({ key, label, icon: Icon, color }) => <button key={key} type="button" aria-pressed={activeLayers.includes(key)} onClick={() => change("tipos", (activeLayers.includes(key) ? activeLayers.filter(item => item !== key) : [...activeLayers, key]).join(","))} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${activeLayers.includes(key) ? "border-[#a9d2ed] bg-[#edf7fa] text-[#001B62]" : "bg-white text-[#8190a4]"}`}><Icon className="size-3.5" style={{ color }}/>{label}</button>)}</div>
        <label className="mb-5 block text-xs font-medium text-[#52647d]">Municipio<select aria-label="Municipio del mapa" value={municipality} onChange={event => change("municipio", event.target.value)} className="mt-2 h-10 w-full rounded-lg border bg-[#f8fafc] px-3 text-xs text-[#173257]"><option value="">Todos los municipios</option>{pueblaMunicipalities.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
        {loading ? <p role="status" className="grid min-h-80 place-items-center text-sm text-[#8190a4]">Cargando municipios y registros…</p> : error || geometryError ? <div role="alert" className="rounded-lg bg-[#f6f8fb] px-5 py-12 text-center text-sm"><p>No pudimos cargar el mapa y sus registros.</p><Button variant="outline" className="mt-4" onClick={() => { setGeometryError(false); setAttempt(value => value + 1); void reload(); }}>Reintentar</Button></div> : data ? <MunicipalMap data={data} selected={municipality} onPickPoint={null} selectedPoint={null} onSelect={(code: string) => change("municipio", code === municipality ? "" : code)}/> : <p role="status" className="grid min-h-80 place-items-center text-sm text-[#8190a4]">Cargando mapa municipal…</p>}
        <p className="mt-4 text-[11px] leading-relaxed text-[#8190a4]">Fuente cartográfica: INEGI, Marco Geoestadístico, diciembre de 2025. Las personas se muestran por su vínculo municipal.</p>
      </section>
      <aside className="min-w-0 rounded-xl border bg-white p-5"><h2 className="flex items-center gap-2 text-sm font-semibold text-[#001B62]"><MapPin className="size-4 text-[#1684a5]"/>{selected?.name || "Resultados del mapa"}</h2><p className="mt-2 text-xs text-[#8190a4]" aria-live="polite">{loading ? "Cargando registros…" : `${results.length} registros encontrados`}</p>{municipality && <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => change("municipio", "")}><X className="size-3"/>Quitar municipio</Button>}
        {!loading && !error && <div className="mt-4 space-y-2">{results.map(record => { const layer = layers.find(item => item.key === record.type)!; const Icon = layer.icon; return <Link key={`${record.type}-${record.id}`} href={record.href} className="group flex items-start gap-3 rounded-lg border border-transparent p-3 transition hover:border-[#a9d2ed] hover:bg-[#f3f9fc]"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf7fa] text-[#1684a5]"><Icon className="size-4"/></span><span className="min-w-0 flex-1"><strong className="block text-xs font-semibold leading-relaxed text-[#001B62]">{record.name}</strong><span className="mt-1 block text-[11px] leading-relaxed text-[#8190a4]">{layer.label} · {record.municipality || "Municipio sin documentar"}</span></span><ArrowUpRight className="mt-1 size-3.5 text-[#a1adbc] group-hover:text-[#1684a5]"/></Link>; })}{!results.length && <p className="rounded-lg bg-[#f6f8fb] p-5 text-center text-xs leading-relaxed text-[#8190a4]">No hay registros publicados para estos filtros.</p>}</div>}
        {!loading && matching.some(record => !record.code) && <p className="mt-5 border-t pt-4 text-[11px] leading-relaxed text-[#8190a4]">{matching.filter(record => !record.code).length} registros aún no tienen un municipio documentado.</p>}
      </aside>
    </div>
  </div>;
}
