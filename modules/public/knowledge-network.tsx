"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Network, RotateCcw, Search } from "lucide-react";
import { usePublicCatalog } from "@/components/public/public-catalog-provider";
import { SectionShell } from "@/components/integration/section-shell";
import { authorCatalogs, buildKnowledgeGraph, buildUnifiedCatalogs } from "@/lib/integration/records";

const colors: Record<string,string> = {rec:"#033AA5",ing:"#2789D1",coc:"#EF703C",ep:"#68849e"};
const labels: Record<string,string> = {rec:"Receta",ing:"Ingrediente",coc:"Cocinera o cocinero",ep:"Capítulo"};
export function PublicKnowledgeNetwork() {
  const catalog = usePublicCatalog();
  const [search,setSearch] = useState("");
  const [selected,setSelected] = useState("");
  const [positions,setPositions] = useState<Record<string,{x:number;y:number}>>({});
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{id:string;x:number;y:number;startX:number;startY:number}|null>(null);
  const graph = useMemo(()=>{
    const result=buildKnowledgeGraph(buildUnifiedCatalogs({},authorCatalogs(catalog.recipes,catalog.cooks,catalog.ingredients)));
    result.nodes.push(...catalog.episodes.map(episode=>({id:`podcast:${episode.id}`,n:episode.title,t:"ep",to:`/podcast/${encodeURIComponent(episode.id)}`,r:14,x:0,y:0})));
    result.nodes.forEach((node,index)=>{node.x=380+295*Math.cos(index*2*Math.PI/Math.max(result.nodes.length,1));node.y=240+175*Math.sin(index*2*Math.PI/Math.max(result.nodes.length,1));});
    const lookup=new Map(result.nodes.map(node=>[node.id.slice(node.id.indexOf(":")+1),node.id]));
    const seen=new Set(result.edges.map(edge=>[edge.source,edge.target].sort().join("|")));
    const episodeLinks=catalog.episodes.flatMap(episode=>[...episode.recipeIds,...episode.ingredientIds].map(id=>({source:episode.id,target:id,type:"documenta"})));
    for(const relation of [...catalog.relations,...episodeLinks]){
      const source=lookup.get(relation.source),target=lookup.get(relation.target);
      if(!source||!target||source===target)continue;
      const key=[source,target].sort().join("|");
      if(!seen.has(key)){seen.add(key);result.edges.push({source,target,type:relation.type});}
    }
    return result;
  },[catalog.recipes,catalog.cooks,catalog.ingredients,catalog.episodes,catalog.relations]);
  const matches = graph.nodes.filter(node=>node.n.toLocaleLowerCase("es-MX").includes(search.toLocaleLowerCase("es-MX")));
  const selectedNode = graph.nodes.find(node=>node.id===selected);
  const neighbors = new Set(graph.edges.filter(edge=>edge.source===selected||edge.target===selected).flatMap(edge=>[edge.source,edge.target]));
  const point = (id:string) => positions[id] || graph.nodes.find(node=>node.id===id)!;
  return <SectionShell activeItem="Red de conocimiento"><header className="acervo-heading"><div><p className="section-kicker">Datos y análisis</p><h1>Red de conocimiento</h1><p>Explora las relaciones entre recetas, ingredientes, personas y capítulos del acervo público.</p></div><Link href="/reportes" className="acervo-secondary">Consultar reportes<ArrowRight className="size-4"/></Link></header>
    {catalog.error?<div role="alert" className="acervo-card mt-6 p-6">{catalog.error}<button onClick={catalog.reload} className="acervo-secondary mt-4">Reintentar</button></div>:catalog.loading?<p role="status" className="py-16 text-center">Cargando la red de conocimiento…</p>:!graph.nodes.length?<div className="acervo-card mt-6 p-12 text-center"><Network className="mx-auto size-10 text-[#A9D2ED]"/><h2 className="mt-4 text-lg font-semibold">La red está por construirse</h2><p className="mt-2 text-sm text-[#8190a4]">Aquí aparecerán los registros publicados y sus relaciones.</p></div>:<section className="acervo-card mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-3 size-4 text-[#8190a4]"/><input aria-label="Buscar en la red" placeholder="Buscar receta, ingrediente o persona…" value={search} onChange={event=>setSearch(event.target.value)} className="acervo-input h-10 w-full pl-10"/></div><button onClick={()=>{setPositions({});setSelected("");setSearch("");}} className="acervo-secondary"><RotateCcw className="size-4"/>Restablecer</button></div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]"><div className="min-w-0 p-4"><svg ref={svg} viewBox="0 0 760 480" role="group" aria-label="Relaciones del acervo" className="w-full rounded-xl bg-[#f8fafc]" onPointerMove={event=>{if(!drag.current)return;const box=svg.current!.getBoundingClientRect();const start=drag.current;setPositions(values=>({...values,[start.id]:{x:Math.max(35,Math.min(725,start.x+(event.clientX-box.left)/box.width*760-start.startX)),y:Math.max(30,Math.min(435,start.y+(event.clientY-box.top)/box.height*480-start.startY))}}));}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
        {graph.edges.map((edge,index)=>{const a=point(edge.source),b=point(edge.target);return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={neighbors.has(edge.source)&&neighbors.has(edge.target)?"#033AA5":"#A9D2ED"} strokeWidth="1.5"><title>{edge.type}</title></line>;})}
        {graph.nodes.map(node=>{const p=point(node.id);const dimmed=(selected&&!neighbors.has(node.id)&&node.id!==selected)||(search&&!matches.includes(node));return <g key={node.id} transform={`translate(${p.x},${p.y})`} role="button" tabIndex={0} aria-label={`${labels[node.t]}, ${node.n}`} aria-pressed={selected===node.id} className="cursor-grab outline-none focus:stroke-[#FFBF18]" opacity={dimmed?.25:1} style={{touchAction:"none"}} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setSelected(node.id);}}} onPointerDown={event=>{const parent=svg.current!;parent.setPointerCapture(event.pointerId);const box=parent.getBoundingClientRect();drag.current={id:node.id,x:p.x,y:p.y,startX:(event.clientX-box.left)/box.width*760,startY:(event.clientY-box.top)/box.height*480};setSelected(node.id);}}><circle r={node.r} fill={colors[node.t]} stroke={selected===node.id?"#FFBF18":"white"} strokeWidth="3"/><text y={node.r+16} textAnchor="middle" fontSize="11" fill="#001B62" paintOrder="stroke" stroke="white" strokeWidth="3">{node.n}</text></g>;})}
      </svg><div className="mt-4 flex flex-wrap gap-4 text-xs text-[#8190a4]">{Object.entries(labels).map(([key,label])=><span key={key} className="flex items-center gap-2"><i className="size-2.5 rounded-full" style={{background:colors[key]}}/>{label}</span>)}</div><p className="mt-3 text-xs text-[#8190a4]">Selecciona o arrastra un nodo. También puedes usar la lista y el teclado.</p></div>
      <aside className="border-t bg-[#f8fafc] p-5 lg:border-l lg:border-t-0"><p className="text-xs text-[#8190a4]">{graph.nodes.length} registros · {graph.edges.length} relaciones</p>{selectedNode&&<div className="my-4 rounded-xl border border-[#A9D2ED] bg-white p-4"><strong className="text-sm">{selectedNode.n}</strong><p className="my-2 text-xs text-[#8190a4]">{labels[selectedNode.t]}</p><Link href={selectedNode.to} className="inline-flex items-center gap-2 text-xs font-semibold text-[#033AA5]">Ver ficha<ArrowRight className="size-3"/></Link></div>}<h2 className="my-4 text-sm font-semibold">Registros de la red</h2><ul className="max-h-80 space-y-1 overflow-y-auto">{matches.map(node=><li key={node.id}><button onClick={()=>setSelected(node.id)} className={`w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-white ${selected===node.id?"bg-white font-semibold text-[#033AA5]":"text-[#52647d]"}`}>{node.n}</button></li>)}</ul>{!matches.length&&<p className="text-xs">No encontramos registros con esa búsqueda.</p>}</aside></div>
    </section>}
  </SectionShell>;
}
