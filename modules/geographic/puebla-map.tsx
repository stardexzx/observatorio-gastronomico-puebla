"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, MapPinned, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { municipalityLabels } from "@/lib/dashboard-view";

type Position = [number, number];
type PolygonCoordinates = Position[][];
type GeoFeature = {
  properties: { cvegeo:string; cve_mun:string; nomgeo:string; pob_total:string };
  geometry: { type:"Polygon"; coordinates:PolygonCoordinates } | { type:"MultiPolygon"; coordinates:PolygonCoordinates[] };
};
type GeoCollection = { metadata?:Record<string,string|number>; features:GeoFeature[] };

const colors=["#edf3f5","#c8dfe4","#8dbcc6","#43869a","#164f70","#102f4f"];

function allPositions(feature:GeoFeature){
  const polygons=feature.geometry.type==="Polygon"?[feature.geometry.coordinates]:feature.geometry.coordinates;
  return polygons.flatMap((polygon)=>polygon.flat());
}

export function PueblaMap({compact=false,large=false}:{compact?:boolean;large?:boolean}){
  const mapHeight=large?"h-[300px] sm:h-[360px]":compact?"h-[180px]":"h-[300px]";
  const {filters,selectMunicipality,view}=useDashboard();
  const [geojson,setGeojson]=useState<GeoCollection|null>(null);
  const [error,setError]=useState(false);
  const [attempt,setAttempt]=useState(0);
  const [hovered,setHovered]=useState<string|null>(null);

  useEffect(()=>{
    let active=true;
    fetch("/maps/puebla-municipios.geojson").then((response)=>{if(!response.ok)throw new Error("No se pudo cargar el mapa");return response.json()}).then((data)=>{if(active)setGeojson(data as GeoCollection)}).catch(()=>{if(active)setError(true)});
    return()=>{active=false};
  },[attempt]);

  const map=useMemo(()=>{
    if(!geojson)return null;
    const positions=geojson.features.flatMap(allPositions);
    const minX=Math.min(...positions.map(([x])=>x)); const maxX=Math.max(...positions.map(([x])=>x));
    const minY=Math.min(...positions.map(([,y])=>y)); const maxY=Math.max(...positions.map(([,y])=>y));
    const width=large?360:620,height=large?400:300,padding=large?14:10; const scale=Math.min((width-padding*2)/(maxX-minX),(height-padding*2)/(maxY-minY));
    const offsetX=(width-(maxX-minX)*scale)/2; const offsetY=(height-(maxY-minY)*scale)/2;
    const project=([x,y]:Position)=>[offsetX+(x-minX)*scale,offsetY+(maxY-y)*scale];
    const toPath=(feature:GeoFeature)=>{
      const polygons=feature.geometry.type==="Polygon"?[feature.geometry.coordinates]:feature.geometry.coordinates;
      return polygons.map((polygon)=>polygon.map((ring)=>ring.map((point,index)=>{const [x,y]=project(point);return `${index?"L":"M"}${x.toFixed(1)},${y.toFixed(1)}`}).join("")+"Z").join(" ")).join(" ");
    };
    const features=geojson.features.map((feature)=>({feature,path:toPath(feature),score:(Number(feature.properties.cve_mun)*37)%101})).sort((a,b)=>b.score-a.score);
    return {features,width,height};
  },[geojson,large]);

  if(error)return <div className={`flex ${mapHeight} flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/50 text-center`}><AlertTriangle className="size-8 text-red-500"/><p className="mt-3 text-sm font-bold text-slate-700">No pudimos cargar la capa municipal</p><p className="mt-1 text-xs text-slate-500">El archivo local del mapa no está disponible.</p><Button variant="outline" size="sm" onClick={()=>{setError(false);setGeojson(null);setAttempt(value=>value+1)}} className="mt-4"><RotateCw className="size-4"/>Reintentar</Button></div>;
  if(!map)return <div className={`relative ${mapHeight} overflow-hidden rounded-xl border border-slate-200 bg-[#edf3f5]`}><Skeleton className="absolute inset-6 rounded-[40%]"/><div className="absolute inset-0 grid place-items-center text-xs font-semibold text-slate-500">Cargando 217 municipios…</div></div>;

  const coverageTarget=filters.municipality==="todos"?(view.coverage.at(-1)?.value??90):1;
  const coveredCodes=new Set(map.features.slice(0,coverageTarget).map(({feature})=>feature.properties.cvegeo));
  const activeCode=filters.municipality==="todos"?null:filters.municipality;
  return <div>
    <div className={`relative overflow-hidden rounded-xl ${large?"bg-[#f8fafc]":"border border-slate-200 bg-[#edf3f5]"}`}>
      <svg viewBox={`0 0 ${map.width} ${map.height}`} className={`block ${mapHeight} w-full`} role="img" aria-label="Mapa municipal de Puebla con 217 áreas geoestadísticas municipales">
        {map.features.map(({feature,path,score})=>{const code=feature.properties.cvegeo;const covered=activeCode?code===activeCode:coveredCodes.has(code);const selected=code===activeCode;const level=covered?Math.min(5,1+Math.floor(score/21)):0;return <path key={code} d={path} fill={colors[level]} stroke={selected?"#f3be4d":"#ffffff"} strokeWidth={selected?2.5:.65} vectorEffect="non-scaling-stroke" fillRule="evenodd" tabIndex={0} role="button" aria-label={`${feature.properties.nomgeo}, ${covered?"con registros":"sin registros simulados"}`} className="cursor-pointer outline-none transition hover:fill-[#c45a32] focus:fill-[#c45a32]" onMouseEnter={()=>setHovered(code)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(code)} onBlur={()=>setHovered(null)} onClick={()=>selectMunicipality(code)} onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();selectMunicipality(code)}}}><title>{feature.properties.nomgeo} · {covered?`${Math.max(1,Math.round(score*1.6))} registros simulados`:"sin registros simulados"}</title></path>})}
      </svg>
      {hovered&&<div className="pointer-events-none absolute right-3 top-3 rounded-lg bg-[#102f4f] px-3 py-2 text-xs font-semibold text-white shadow-lg"><MapPinned className="mr-1.5 inline size-3.5 text-[#f3be4d]"/>{municipalityLabels[hovered]}</div>}
      {!compact&&<div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-[10px] text-slate-500 shadow-sm"><div className="mb-1 font-semibold text-slate-700">Concentración de registros</div><div className="flex gap-1">{colors.slice(1).map(color=><span key={color} className="h-2 w-6 rounded-sm" style={{background:color}}/>)}</div><div className="mt-1 flex justify-between"><span>Baja</span><span>Alta</span></div></div>}
    </div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500"><span><strong className="text-slate-700">217</strong> municipios · <strong className="text-slate-700">{coverageTarget}</strong> con registros</span>{!compact&&<span>Fuente: INEGI, Marco Geoestadístico dic. 2025</span>}</div>
    {activeCode&&<button onClick={()=>selectMunicipality("todos")} className="mt-2 text-xs font-semibold text-[#174f78] hover:underline">Quitar filtro de {municipalityLabels[activeCode]}</button>}
  </div>;
}
