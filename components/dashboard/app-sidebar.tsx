"use client";

import { BookOpen, ChefHat, CircleGauge, FileText, Map, Network, Scale, Settings, ShoppingBasket, Wheat } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useDashboard } from "./dashboard-context";
import type { CategoryFilter } from "@/lib/dashboard-view";

const navigation: { label:string; icon:typeof CircleGauge; section:string; category?:CategoryFilter }[] = [
  { label: "Resumen", icon: CircleGauge, section: "resumen" }, { label: "Mapa", icon: Map, section: "distribucion" }, { label: "Red de conocimiento", icon: Network, section: "tendencias" },
  { label: "Recetas", icon: BookOpen, section: "distribucion", category:"recetas" }, { label: "Ingredientes", icon: Wheat, section: "distribucion", category:"ingredientes" }, { label: "Mercados y tianguis", icon: ShoppingBasket, section: "distribucion", category:"mercados" },
  { label: "Cocineras y cocineros", icon: ChefHat, section: "distribucion", category:"cocineras" }, { label: "Protección legal", icon: Scale, section: "distribucion", category:"legal" }, { label: "Reportes", icon: FileText, section: "calidad" },
];

export function AppSidebar({ currentModule = "dashboard" }: { currentModule?: "dashboard" | "recetas" }) {
  const { activeSection, filters, navigateTo, selectCategory } = useDashboard();
  const router = useRouter();
  const openItem = (label:string, section:string, category?:CategoryFilter) => {
    if (label === "Recetas") { router.push("/recetas"); return; }
    if (currentModule === "recetas") { router.push(section === "resumen" ? "/" : `/#${section}`); return; }
    if (category) selectCategory(category); else navigateTo(section);
  };
  return <Sidebar collapsible="icon" className="border-r border-[#daddd8]">
    <SidebarHeader className="border-b px-3 py-4"><button onClick={() => currentModule === "recetas" ? router.push("/") : navigateTo("resumen")} className="flex min-h-11 items-center gap-3 overflow-hidden px-1 text-left"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#17324a] text-sm font-bold text-white"><span className="h-4 w-4 rounded-full border-[3px] border-[#d99a2b]"/></span><span className="min-w-0 group-data-[collapsible=icon]:hidden"><strong className="font-display block text-base font-bold leading-tight text-[#17324a]">Observatorio</strong><span className="text-[11px] leading-tight text-[#68757c]">Gastronómico de Puebla</span></span></button></SidebarHeader>
    <SidebarContent className="px-3 py-5"><p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#8a9498] group-data-[collapsible=icon]:hidden">Navegación</p><SidebarGroup className="p-0"><SidebarGroupContent><SidebarMenu className="gap-1">{navigation.map(({ label, icon: Icon, section, category }) => { const active = currentModule === "recetas" ? label === "Recetas" : category ? activeSection === "distribucion" && filters.category === category : activeSection === section && (section !== "distribucion" || filters.category === "todas"); return <SidebarMenuItem key={label}><SidebarMenuButton tooltip={label} isActive={active} onClick={() => openItem(label,section,category)} className="h-10 rounded-lg px-3 text-[#59666c] hover:bg-[#e2e7e4] hover:text-[#17324a] data-[active=true]:bg-[#17324a] data-[active=true]:font-semibold data-[active=true]:text-white"><Icon className="!size-[18px]" /><span>{label}</span></SidebarMenuButton></SidebarMenuItem> })}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
    <SidebarFooter className="border-t p-3"><SidebarMenu><SidebarMenuItem><SidebarMenuButton tooltip="Configuración" onClick={() => toast.info("La configuración de usuarios se incorporará con el backend.")} className="h-10 rounded-lg px-3 text-[#59666c] hover:bg-[#e2e7e4] hover:text-[#17324a]"><Settings className="!size-[18px]" /><span>Configuración</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
  </Sidebar>;
}
