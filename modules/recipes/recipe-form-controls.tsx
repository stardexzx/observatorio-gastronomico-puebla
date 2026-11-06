"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { pueblaMunicipalities } from "@/data/puebla-municipalities";
import { getMunicipalityRegion } from "@/data/puebla-regions";

export type MunicipalityOption={code:string;name:string};

export function SearchSelect({id,value,options,placeholder,emptyText="Sin resultados",side="down",inlineMenu=false,onChange}:{id:string;value:string;options:{value:string;label:string;description?:string}[];placeholder:string;emptyText?:string;side?:"up"|"down";inlineMenu?:boolean;onChange:(value:string)=>void}){
  const [open,setOpen]=useState(false);const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close)},[open]);
  const selected=options.find(option=>option.value===value);
  return <div ref={root} className="relative" onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();setOpen(false);root.current?.querySelector("button")?.focus();}}}><button id={id} type="button" aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(current=>!current)} className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-white px-3 text-left text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-[#174f78]/25"><span className={selected?"truncate text-slate-800":"truncate text-muted-foreground"}>{selected?.label??placeholder}</span><ChevronDown className={`size-4 text-slate-400 transition ${open?"rotate-180":""}`}/></button>{open&&<div className={`${inlineMenu?"relative mt-1":"absolute left-0 z-[90] w-full "+(side==="up"?"bottom-full mb-1":"top-full mt-1")} overflow-hidden rounded-xl border bg-white shadow-xl`}><Command filter={(value,query)=>normalizeText(value).includes(normalizeText(query))?1:0}><CommandInput autoFocus aria-label="Buscar opciones" placeholder="Escribe para buscar..."/><CommandList onWheel={event=>event.stopPropagation()} className="max-h-48 overflow-y-auto overscroll-contain"><CommandEmpty>{emptyText}</CommandEmpty><CommandGroup>{options.map(option=><CommandItem key={option.value} value={`${option.label} ${option.description??""}`} onSelect={()=>{onChange(option.value);setOpen(false)}} className="cursor-pointer py-2 data-[selected=true]:bg-[#e8efff] data-[selected=true]:text-[#10284b]"><Check className={`size-4 ${value===option.value?"opacity-100":"opacity-0"}`}/><span className="min-w-0"><span className="block truncate">{option.label}</span>{option.description&&<span className="block text-xs text-slate-400">{option.description}</span>}</span></CommandItem>)}</CommandGroup></CommandList></Command></div>}</div>;
}

export function MunicipalityField({id,value,side,inlineMenu,onChange}:{id:string;value:string;side?:"up"|"down";inlineMenu?:boolean;onChange:(municipality:MunicipalityOption|null,region:string)=>void}){
  const options=pueblaMunicipalities.map(item=>({value:item.code,label:item.name,description:`INEGI ${item.code}`}));
  return <SearchSelect id={id} value={value} side={side} inlineMenu={inlineMenu} options={options} placeholder="Buscar municipio de Puebla" emptyText="No existe un municipio con ese nombre" onChange={code=>{const item=pueblaMunicipalities.find(option=>option.code===code);onChange(item?{code:item.code,name:item.name}:null,getMunicipalityRegion(code))}}/>;
}

export function Chips({items,onRemove}:{items:string[];onRemove?:(item:string)=>void}){return <div className="flex flex-wrap gap-2">{items.map(item=><Badge key={item} variant="secondary" className="gap-1 rounded-lg px-2.5 py-1">{item}{onRemove&&<button type="button" onClick={()=>onRemove(item)} aria-label={`Quitar ${item}`}><X className="size-3"/></button>}</Badge>)}</div>}

export function ChoiceChips({options,value,onChange}:{options:string[];value:string[];onChange:(value:string[])=>void}){return <div className="flex flex-wrap gap-2">{options.map(option=>{const active=value.includes(option);return <Button key={option} type="button" size="sm" variant="outline" aria-pressed={active} onClick={()=>onChange(active?value.filter(item=>item!==option):[...value,option])} className={`h-10 rounded-xl border px-4 text-[12px] shadow-none ${active?"border-[#8fc6d7] bg-[#eaf7fb] text-[#1684a5] hover:bg-[#e0f1f7]":"border-[#e5eaf0] bg-white text-[#8190a4] hover:bg-[#f8fafc]"}`}>{active&&<Check className="size-3.5"/>}{option}</Button>})}</div>}

export const normalizeText=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-MX").trim();
