"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Network, RotateCcw, Search } from "lucide-react";
import { usePublicCatalog } from "@/components/public/public-catalog-provider";
import { SectionShell } from "@/components/integration/section-shell";
import { authorCatalogs, buildKnowledgeGraph, buildUnifiedCatalogs } from "@/lib/integration/records";
import { addPublicLegalGraph } from "@/lib/legal-public-relations";
import { filterKnowledgeGraph } from "@/lib/knowledge-graph-filter";

const colors: Record<string,string> = {rec:"#033AA5",ing:"#2789D1",coc:"#EF703C",ep:"#68849e",leg:"#10284C",mer:"#D89A2E",mun:"#B23A1F"};
const labels: Record<string,string> = {rec:"Receta",ing:"Ingrediente",coc:"Cocinera o cocinero",ep:"Capítulo",leg:"Instrumento jurídico",mer:"Mercado",mun:"Municipio"};
const classLabels: Record<string,string> = {rec:"Recetas",ing:"Ingredientes",coc:"Cocineras y cocineros",ep:"Capítulos",leg:"Instrumentos jurídicos",mer:"Mercados",mun:"Municipios"};
const activeClassStyle = {background:"#edf7fa",borderColor:"#A9D2ED",color:"#033AA5"};
export function PublicKnowledgeNetwork() {
  const catalog = usePublicCatalog();
  const [search,setSearch] = useState("");
  const [selectedClasses,setSelectedClasses] = useState<string[]>([]);
  const [selected,setSelected] = useState("");
  const [positions,setPositions] = useState<Record<string,{x:number;y:number}>>({});
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{id:string;x:number;y:number;startX:number;startY:number}|null>(null);
  const graph = useMemo(()=>{
    const result=buildKnowledgeGraph(buildUnifiedCatalogs({},authorCatalogs(catalog.recipes,catalog.cooks,catalog.ingredients)));
    result.nodes.push(...catalog.episodes.map(episode=>({id:`podcast:${episode.id}`,n:episode.title,t:"ep",to:`/podcast/${encodeURIComponent(episode.id)}`,r:14,x:0,y:0})));
    const prefixes:Record<string,string>={recipes:"recetas",ingredients:"ingredientes",cooks:"cocineras",producers:"cocineras",episodes:"podcast",markets:"mercados"};
    const lookup=new Map<string,string[]>();
    for(const node of result.nodes){
      const id=node.id.slice(node.id.indexOf(":")+1);
      lookup.set(id,[...(lookup.get(id)||[]),node.id]);
    }
    const resolve=(id:string,kind?:string)=>{
      const matches=lookup.get(id)||[];
      return kind?matches.find(value=>value===`${prefixes[kind]||kind}:${id}`):matches.length===1?matches[0]:undefined;
    };
    const seen=new Set(result.edges.map(edge=>[edge.source,edge.target].sort().join("|")));
    const episodeLinks=catalog.episodes.flatMap(episode=>[...episode.recipeIds.map(id=>({source:episode.id,target:id,sourceKind:"episodes",targetKind:"recipes",type:"documenta"})),...episode.ingredientIds.map(id=>({source:episode.id,target:id,sourceKind:"episodes",targetKind:"ingredients",type:"documenta"}))]);
    for(const relation of [...catalog.relations,...episodeLinks]){
      const source=resolve(relation.source,relation.sourceKind),target=resolve(relation.target,relation.targetKind);
      if(!source||!target||source===target)continue;
      const key=[source,target].sort().join("|");
      if(!seen.has(key)){seen.add(key);result.edges.push({source,target,type:relation.type});}
    }
    const complete=addPublicLegalGraph(result,catalog);
    complete.nodes.forEach((node,index)=>{node.x=380+295*Math.cos(index*2*Math.PI/Math.max(complete.nodes.length,1));node.y=240+175*Math.sin(index*2*Math.PI/Math.max(complete.nodes.length,1));});
    return complete;
  },[catalog]);
  const availableClasses = useMemo(()=>{
    const present=new Set(graph.nodes.map(node=>node.t));
    return [...Object.keys(classLabels).filter(type=>present.has(type)),...Array.from(present).filter(type=>!classLabels[type])];
  },[graph]);
  const visible = useMemo(()=>filterKnowledgeGraph(graph,selectedClasses,search),[graph,selectedClasses,search]);
  const selectedNode = visible.nodes.find(node=>node.id===selected);
  const activeSelected = selectedNode?.id || "";
  const neighbors = new Set(visible.edges.filter(edge=>edge.source===activeSelected||edge.target===activeSelected).flatMap(edge=>[edge.source,edge.target]));
  const legalNeighbors=visible.edges.filter(edge=>edge.type==="instrumento_relacionado"&&(edge.source===activeSelected||edge.target===activeSelected)).map(edge=>({edge,node:visible.nodes.find(node=>node.id===(edge.source===activeSelected?edge.target:edge.source))!}));
  const point = (id:string) => positions[id] || graph.nodes.find(node=>node.id===id)!;
  const clearSelection = () => {setSelected("");drag.current=null;};
  const reset = () => {setSearch("");setSelectedClasses([]);setPositions({});clearSelection();};
  const toggleClass = (type:string) => {
    setSelectedClasses(current=>current.includes(type)?current.filter(value=>value!==type):[...current,type]);
    clearSelection();
  };
  return <SectionShell activeItem="Red de conocimiento"><header className="acervo-heading"><div><p className="section-kicker">Datos y análisis</p><h1>Red de conocimiento</h1><p>Explora las relaciones entre recetas, ingredientes, personas, capítulos e instrumentos jurídicos del acervo público.</p></div><Link href="/reportes" className="acervo-secondary">Consultar reportes<ArrowRight className="size-4"/></Link></header>
    {catalog.error?<div role="alert" className="acervo-card mt-6 p-6">{catalog.error}<button onClick={catalog.reload} className="acervo-secondary mt-4">Reintentar</button></div>:catalog.loading?<p role="status" className="py-16 text-center">Cargando la red de conocimiento…</p>:!graph.nodes.length?<div className="acervo-card mt-6 p-12 text-center"><Network className="mx-auto size-10 text-[#A9D2ED]"/><h2 className="mt-4 text-lg font-semibold">La red está por construirse</h2><p className="mt-2 text-sm text-[#8190a4]">Aquí aparecerán los registros publicados y sus relaciones.</p></div>:<section className="acervo-card mt-6 overflow-hidden">
      <div className="border-b p-5">
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-3 size-4 text-[#8190a4]"/><input aria-label="Buscar en la red" placeholder="Buscar registro o instrumento jurídico…" value={search} onChange={event=>{setSearch(event.target.value);clearSelection();}} className="acervo-input h-10 w-full pl-10"/></div><button type="button" onClick={reset} className="acervo-secondary"><RotateCcw className="size-4"/>Restablecer</button></div>
        <fieldset className="mt-4"><legend className="text-xs font-semibold text-[#52647d]">Filtrar por clase</legend><p className="mt-1 text-xs text-[#8190a4]">Puedes combinar varias clases y la búsqueda.</p><div className="mt-3 flex flex-wrap gap-2">
          <button type="button" aria-pressed={!selectedClasses.length} onClick={()=>{setSelectedClasses([]);clearSelection();}} className="acervo-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#033AA5]" style={!selectedClasses.length?activeClassStyle:undefined}>Todos</button>
          {availableClasses.map(type=><button key={type} type="button" aria-pressed={selectedClasses.includes(type)} onClick={()=>toggleClass(type)} className="acervo-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#033AA5]" style={selectedClasses.includes(type)?activeClassStyle:undefined}><i aria-hidden="true" className="size-2.5 rounded-full" style={{background:colors[type]||"#10284C"}}/>{classLabels[type]||type}</button>)}
        </div></fieldset>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]"><div className="min-w-0 p-4"><div className="relative"><svg ref={svg} viewBox="0 0 760 480" role="group" aria-label="Relaciones del acervo" className="w-full rounded-xl bg-[#f8fafc]" onPointerMove={event=>{if(!drag.current)return;const box=svg.current!.getBoundingClientRect();const start=drag.current;setPositions(values=>({...values,[start.id]:{x:Math.max(35,Math.min(725,start.x+(event.clientX-box.left)/box.width*760-start.startX)),y:Math.max(30,Math.min(435,start.y+(event.clientY-box.top)/box.height*480-start.startY))}}));}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
        {visible.edges.map((edge,index)=>{const a=point(edge.source),b=point(edge.target);return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={neighbors.has(edge.source)&&neighbors.has(edge.target)?"#033AA5":"#A9D2ED"} strokeWidth="1.5"><title>{[edge.label||edge.type,edge.scope].filter(Boolean).join(" · ")}</title></line>;})}
        {visible.nodes.map(node=>{const p=point(node.id);const dimmed=activeSelected&&!neighbors.has(node.id)&&node.id!==activeSelected;return <g key={node.id} transform={`translate(${p.x},${p.y})`} role="button" tabIndex={0} aria-label={`${labels[node.t]||node.t}, ${node.n}`} aria-pressed={activeSelected===node.id} className="cursor-grab outline-none focus:stroke-[#FFBF18]" opacity={dimmed?.25:1} style={{touchAction:"none"}} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setSelected(node.id);}}} onPointerDown={event=>{const parent=svg.current!;parent.setPointerCapture(event.pointerId);const box=parent.getBoundingClientRect();drag.current={id:node.id,x:p.x,y:p.y,startX:(event.clientX-box.left)/box.width*760,startY:(event.clientY-box.top)/box.height*480};setSelected(node.id);}}><circle r={node.r} fill={colors[node.t]||"#10284C"} stroke={activeSelected===node.id?"#FFBF18":"white"} strokeWidth="3"/><text y={node.r+16} textAnchor="middle" fontSize="11" fill="#001B62" paintOrder="stroke" stroke="white" strokeWidth="3">{node.n}</text></g>;})}
      </svg>{!visible.nodes.length&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center"><Network aria-hidden="true" className="size-8 text-[#A9D2ED]"/><p className="text-sm text-[#52647d]">No encontramos registros con esos filtros.</p><button type="button" onClick={reset} className="acervo-secondary">Limpiar filtros</button></div>}</div><div className="mt-4 flex flex-wrap gap-4 text-xs text-[#8190a4]">{availableClasses.filter(type=>visible.nodes.some(node=>node.t===type)).map(type=><span key={type} className="flex items-center gap-2"><i aria-hidden="true" className="size-2.5 rounded-full" style={{background:colors[type]||"#10284C"}}/>{labels[type]||type}</span>)}</div><p className="mt-3 text-xs text-[#8190a4]">Selecciona o arrastra un nodo. También puedes usar la lista y el teclado.</p></div>
      <aside className="border-t bg-[#f8fafc] p-5 lg:border-l lg:border-t-0"><p role="status" aria-label="Resumen de la red" className="text-xs text-[#8190a4]">{visible.nodes.length} registros · {visible.edges.length} relaciones</p>{selectedNode&&<div className="my-4 rounded-xl border border-[#A9D2ED] bg-white p-4"><strong className="text-sm">{selectedNode.n}</strong><p className="my-2 text-xs text-[#8190a4]">{labels[selectedNode.t]||selectedNode.t}</p><Link href={selectedNode.to} className="inline-flex items-center gap-2 text-xs font-semibold text-[#033AA5]">Ver ficha<ArrowRight className="size-3"/></Link>{!!legalNeighbors.length&&<div className="mt-3 border-t pt-3"><p className="text-xs font-semibold text-[#10284C]">Vínculos jurídicos documentados</p><ul className="mt-2 space-y-3">{legalNeighbors.map(({node,edge})=><li key={node.id}><Link href={node.to} className="inline-flex items-center gap-2 text-xs font-semibold text-[#10284C]">{node.n}<ArrowRight className="size-3"/></Link>{edge.scope&&<p className="mt-1 text-xs text-[#52647d]">{edge.scope}</p>}</li>)}</ul><p className="mt-3 text-xs text-[#52647d]">El vínculo no otorga derechos ni protección automática.</p></div>}</div>}<h2 className="my-4 text-sm font-semibold">Registros de la red</h2><ul aria-label="Registros de la red" className="max-h-80 space-y-1 overflow-y-auto">{visible.nodes.map(node=><li key={node.id}><button onClick={()=>setSelected(node.id)} className={`w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-white ${activeSelected===node.id?"bg-white font-semibold text-[#033AA5]":"text-[#52647d]"}`}>{node.n}</button></li>)}</ul>{!visible.nodes.length&&<p className="text-xs">Prueba otra búsqueda o restablece los filtros.</p>}</aside></div>
    </section>}
  </SectionShell>;
}
