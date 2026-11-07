"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BarChart3, BookOpen, ChefHat, ChevronDown, FileText, History, Info, Layers3, Map, Menu, Mic2, Network, Scale, Search, ShoppingBasket, Wheat, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserControls } from "./user-controls";

const acervo = [
  { label: "Recetas", icon: BookOpen, href: "/recetas" },
  { label: "Recetario", icon: BookOpen, href: "/recetario" },
  { label: "Ingredientes", icon: Wheat, href: "/ingredientes" },
  { label: "Mercados y tianguis", icon: ShoppingBasket, href: "/mercados" },
  { label: "Cocineras y cocineros", icon: ChefHat, href: "/cocineras" },
];
const navigation = [
  { label: "Resumen", icon: BarChart3, href: "/" },
  { label: "Mapa", icon: Map, href: "/mapa" },
  { label: "Protección legal", icon: Scale, href: "/proteccion-legal" },
  { label: "Podcast", icon: Mic2, href: "/podcast" },
];
const analysis = [
  { label: "Reportes", icon: FileText, href: "/reportes" },
  { label: "Red de conocimiento", icon: Network, href: "/red-conocimiento" },
];
const about = [
  { label: "Memoria histórica", icon: History, href: "/memoria" },
  { label: "Acerca del Observatorio", icon: Info, href: "/acerca" },
];

export function ObservatorySidebar({ activeItem }: { activeItem: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const results = [...navigation, ...acervo, ...analysis, ...about].filter(item => item.label.toLocaleLowerCase("es-MX").includes(search.toLocaleLowerCase("es-MX")));
  const navLink = ({ label, icon: Icon, href }: typeof navigation[number]) => <Link key={label} href={href} onClick={() => setMobileOpen(false)} aria-current={activeItem === label ? "page" : undefined} className={`admin-nav-link ${activeItem === label ? "is-active" : ""}`}><Icon className="size-4 shrink-0"/>{label}</Link>;

  const menu = (label: string, Icon: typeof Layers3, items: typeof acervo) => <DropdownMenu>
    <DropdownMenuTrigger className={`admin-nav-link ${items.some(item => item.label === activeItem) || activeItem === label ? "is-active" : ""}`}><Icon className="size-4 shrink-0"/>{label}<ChevronDown className="ml-1 size-3.5"/></DropdownMenuTrigger>
    <DropdownMenuContent align="start" sideOffset={8} className="w-64 rounded-xl p-2">{items.map(({label,href,icon:ItemIcon})=><DropdownMenuItem key={label} asChild><Link href={href} onClick={()=>setMobileOpen(false)} aria-current={activeItem===label?"page":undefined} className="rounded-lg py-3"><ItemIcon className="size-4"/>{label}</Link></DropdownMenuItem>)}</DropdownMenuContent>
  </DropdownMenu>;

  return <header className="admin-navigation">
    <div className="admin-header-inner">
      <Link href="/" className="admin-brand-symbol" aria-label="Observatorio Gastronómico de Puebla, inicio" title="Observatorio Gastronómico de Puebla"><Image src="/brand/tibor-talavera.svg" alt="Tibor de Talavera" width={34} height={54} unoptimized className="h-[54px] w-[34px] object-contain"/><span className="admin-brand-name">Observatorio<br/>Gastronómico<span>de Puebla</span></span></Link>
    <nav id="admin-menu" aria-label="Navegación principal" className={`admin-nav-row ${mobileOpen ? "is-open" : ""}`}>
      {navigation.slice(0,2).map(navLink)}
      {menu("Acervo", Layers3, acervo)}
      {menu("Datos y análisis", BarChart3, analysis)}
      {navigation.slice(2).map(navLink)}
      {menu("Conocer el observatorio", Info, about)}
    </nav>
      <div className="admin-header-actions">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}><PopoverTrigger asChild><button className="admin-icon-button" aria-label="Abrir búsqueda" title="Buscar"><Search className="size-[18px]"/></button></PopoverTrigger><PopoverContent align="end" sideOffset={16} className="w-[min(340px,calc(100vw-32px))] rounded-xl p-3">
          <label htmlFor="section-search" className="mb-2 block text-xs font-semibold">Buscar en el observatorio</label>
          <input id="section-search" placeholder="Escribe una sección…" value={search} onChange={event => setSearch(event.target.value)} className="h-10 w-full rounded-lg border bg-[#f8fafc] px-3 text-xs outline-none focus:border-[#1684a5]"/>
          <div className="mt-2">{results.length ? results.map(({ label, href, icon: Icon }) => <Link key={label} href={href} onClick={() => {setSearch("");setSearchOpen(false);setMobileOpen(false);}} className="flex items-center gap-3 rounded-lg p-2.5 text-xs hover:bg-[#edf7fa]"><Icon className="size-4"/>{label}</Link>) : <p className="p-3 text-xs text-slate-500">No encontramos secciones.</p>}</div>
        </PopoverContent></Popover>
        <UserControls/>
        <button className="admin-icon-button admin-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={mobileOpen} aria-controls="admin-menu">{mobileOpen ? <X className="size-5"/> : <Menu className="size-5"/>}</button>
      </div>
    </div>
  </header>;
}
