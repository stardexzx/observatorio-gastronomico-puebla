"use client";

import { useSessionUser } from "@/components/auth/session-provider";
import Link from "next/link";
import { downloadDashboardData } from "@/lib/dashboard-export";
import { DashboardProvider, useDashboard } from "@/components/dashboard/dashboard-context";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardErrorBoundary } from "@/components/dashboard/dashboard-states";
import { ObservatorySidebar } from "@/components/dashboard/observatory-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { CompactOverview } from "@/modules/dashboard/compact-overview";

function DashboardShell(){
  const {isLoading,view,filters,error,reload}=useDashboard();
  const user=useSessionUser();
  return <div className="admin-dashboard min-h-screen bg-[#f5f7f6] text-[#173257]"><ObservatorySidebar activeItem="Resumen"/><main id="resumen" className="admin-main min-h-screen"><div className="mx-auto max-w-[1320px]">
    <header className="dashboard-heading">
      <div className="dashboard-heading-copy"><h1>Resumen del observatorio</h1><p>Cobertura, crecimiento y calidad del acervo publicado.</p></div>
      <DashboardFilters onGenerate={()=>downloadDashboardData(view,filters)}/>
    </header>
    {user && <p className="mt-4 text-xs leading-relaxed text-[#52647d]">Este resumen cuenta las fichas publicadas. Los borradores y registros en revisión se consultan en <Link href="/recetas" className="font-medium text-[#033AA5] underline underline-offset-2">Acervo</Link>.</p>}
    {!error && !isLoading && !view.distributionTotal && <p role="status" className="acervo-card mt-6 p-5 text-sm text-[#52647d]">{filters.period==="todos"&&filters.category==="todas"&&filters.municipality==="todos" ? "Aún no hay fichas publicadas en el observatorio." : "No hay fichas publicadas para estos filtros."}</p>}
    {error && <div className="acervo-card mt-6 p-6" role="alert"><p>{error}</p><button className="acervo-secondary mt-3" onClick={reload}>Reintentar</button></div>}
    {!error && <div className={`${isLoading?"pointer-events-none opacity-45":""} transition`} aria-busy={isLoading}><CompactOverview/></div>}
  </div></main><Toaster position="bottom-right" richColors/></div>
}

export default function Home(){return <DashboardProvider><DashboardErrorBoundary><DashboardShell/></DashboardErrorBoundary></DashboardProvider>}
