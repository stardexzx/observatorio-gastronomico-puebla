"use client";

import { toast } from "sonner";
import { downloadDashboardData } from "@/lib/dashboard-export";
import { DashboardProvider, useDashboard } from "@/components/dashboard/dashboard-context";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardErrorBoundary } from "@/components/dashboard/dashboard-states";
import { ObservatorySidebar } from "@/components/dashboard/observatory-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { CompactOverview } from "@/modules/dashboard/compact-overview";

function DashboardShell(){
  const {isLoading,publicMode,view,filters,error,reload}=useDashboard();
  return <div className="admin-dashboard min-h-screen bg-[#f5f7f6] text-[#173257]"><ObservatorySidebar activeItem="Resumen"/><main id="resumen" className="admin-main min-h-screen"><div className="mx-auto max-w-[1320px]">
    <header className="dashboard-heading">
      <div className="dashboard-heading-copy"><h1>Resumen del observatorio</h1><p>Cobertura, crecimiento y calidad del acervo gastronómico.</p></div>
      <DashboardFilters onGenerate={()=>publicMode ? downloadDashboardData(view,filters) : toast.success("Reporte preliminar generado",{description:"Se aplicaron los filtros seleccionados."})}/>
    </header>
    {error && <div className="acervo-card mt-6 p-6" role="alert"><p>{error}</p><button className="acervo-secondary mt-3" onClick={reload}>Reintentar</button></div>}
    {!error && <div className={`${isLoading?"pointer-events-none opacity-45":""} transition`} aria-busy={isLoading}><CompactOverview/></div>}
  </div></main><Toaster position="bottom-right" richColors/></div>
}

export default function Home(){return <DashboardProvider><DashboardErrorBoundary><DashboardShell/></DashboardErrorBoundary></DashboardProvider>}
