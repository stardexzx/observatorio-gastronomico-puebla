"use client";

import { useState } from "react";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BookOpen, CircleCheck, Database, FileDown, FilePlus2, FileText, ListChecks, MapPin, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { downloadDashboardData } from "@/lib/dashboard-export";
import { pueblaMunicipalities } from "@/data/puebla-municipalities";
import { RecordsTotalCard } from "./records-total-card";
import { GrowthExplorer,CompositionExplorer,DashboardSelection } from "./interactive-charts";
import { PueblaMap } from "@/modules/geographic/puebla-map";

const colors = ["#033AA5", "#2789D1", "#FFBF18", "#EF703C", "#D58B20"];
type RankingKey = "recetas" | "ingredientes" | "mercados" | "municipios";
const rankingTabs: { key: RankingKey; label: string }[] = [
  { key: "recetas", label: "Recetas" }, { key: "ingredientes", label: "Ingredientes" },
  { key: "mercados", label: "Mercados" }, { key: "municipios", label: "Municipios" },
];
const tooltipStyle = { borderRadius: 12, border: "1px solid #e5eaf0", fontSize: 12, boxShadow: "0 6px 24px #1732570d" };

export function CompactOverview() {
  const { view, filters, setFilter } = useDashboard();
  const [qualityOpen,setQualityOpen]=useState<string|null>(null);
  const [ranking, setRanking] = useState<RankingKey>("recetas");
  const coverage = view.coverage.at(-1)?.value ?? 0;
  const activeRanking = view.rankings[ranking];
  const rankingMax = Math.max(...activeRanking.map(item => item.value), 1);
  const period = filters.period === "2024" ? "Ene — May 2024" : filters.period === "2023" ? "Año 2023" : "Ene 2023 — May 2024";

  return <div className="dashboard-overview mt-6 space-y-6 pb-10">
    <DashboardSelection/>
    <section aria-label="Indicadores generales" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <RecordsTotalCard/>
      <Metric icon={MapPin} label="Municipios con registros" value={String(coverage)} suffix="/ 217" detail="Cobertura del territorio poblano" data={view.coverage} color={colors[1]}/>
      <Metric icon={CircleCheck} label="Registros verificados" value={`${view.verified}%`} detail="+8.6 pp vs. periodo anterior" data={view.verification} color={colors[3]}/>
      <Metric icon={Sparkles} label="Municipios con mayor riqueza" value={view.metricValues.wealth} detail="Diversidad del patrimonio" data={view.coverage.slice(-6).map((item,index) => ({ ...item, value: 14 + index * 2 }))} color={colors[2]}/>
    </section>

    <section id="tendencias" aria-label="Tendencias y composición" className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
      <DashboardCard className="growth-card" title="Crecimiento del acervo" subtitle={`Nuevos registros por categoría · ${period}`} action={<span className="dashboard-chip">Evolución</span>}>
        <GrowthExplorer/>
      </DashboardCard>
      <DashboardCard title="Composición del acervo" subtitle="Distribución de los registros">
        <CompositionExplorer/>
      </DashboardCard>
    </section>

    <section id="distribucion" aria-label="Cobertura y rankings" className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <DashboardCard title="Cobertura municipal" subtitle="El patrimonio gastronómico en el territorio" action={<span className="dashboard-chip">{coverage} de 217</span>}>
        <div className="coverage-map-layout mt-5 grid items-center gap-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <PueblaMap compact large/>
          <table className="w-full self-center text-left text-[11px]">
            <caption className="mb-5 text-left text-[12px] font-semibold text-[#52647d]">Mayor concentración</caption>
            <thead><tr className="border-b text-[10px] font-medium text-[#8a97a9]"><th scope="col" className="pb-3 font-medium">Municipio</th><th scope="col" className="pb-3 text-right font-medium">Registros</th></tr></thead>
            <tbody>{view.rankings.municipios.slice(0,4).map(item => <tr key={item.name} className="border-b border-[#edf1f5] last:border-0"><td className="py-3 pr-3 text-[#6e7d91]"><button type="button" className="text-left text-[#033AA5] hover:underline" aria-label={`Filtrar resumen por ${item.name}`} onClick={()=>{const code=pueblaMunicipalities.find(municipality=>municipality.name===item.name)?.code;if(code)setFilter("municipality",filters.municipality===code?"todos":code);}}>{item.name}</button></td><td className="py-3 text-right font-semibold tabular-nums">{item.value}</td></tr>)}</tbody>
          </table>
        </div>
      </DashboardCard>
      <DashboardCard className="ranking-card" title="Lo más documentado" subtitle="Los cinco primeros registros">
        <div className="mt-5 flex gap-1 rounded-lg bg-[#f5f7fa] p-1" role="group" aria-label="Categoría del ranking">{rankingTabs.map(tab => <button key={tab.key} aria-pressed={ranking===tab.key} onClick={() => setRanking(tab.key)} className={`min-w-0 flex-1 rounded-md px-1 py-2 text-[10px] font-medium transition ${ranking===tab.key?"bg-white text-[#1684a5] shadow-sm":"text-[#8190a4] hover:text-[#173257]"}`}>{tab.label}</button>)}</div>
        <ol className="ranking-list mt-5">{activeRanking.slice(0,5).map((item,index) => <li key={item.name} className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3"><span className={`grid size-[30px] place-items-center rounded-lg text-[11px] font-semibold ${index===0?"bg-[#e8f5f9] text-[#1684a5]":"bg-[#f2f5f9] text-[#8a97a9]"}`}>{String(index+1).padStart(2,"0")}</span><div className="min-w-0"><p className="text-[12px] font-medium leading-snug">{item.name}</p><div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#f0f3f7]"><span className="block h-full rounded-full bg-[#62b9ce]" style={{width:`${(item.value/rankingMax)*100}%`}}/></div></div><strong className="min-w-6 text-right text-[14px] font-semibold tabular-nums">{item.value}</strong></li>)}</ol>
      </DashboardCard>
    </section>

    <section id="calidad" aria-label="Calidad, reportes y acciones" className="grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,.9fr)]">
      <DashboardCard title="Calidad de los datos" subtitle="Meta: 80% en cada indicador">
        <div className="mt-6 space-y-5">{view.quality.map((item,index) => {
          const Icon = [Database, ShieldCheck, ListChecks, RefreshCw][index];
          const color = ["#033AA5", "#2789D1", "#D58B20", "#EF703C"][index];
          return <div key={item.label}><button type="button" aria-expanded={qualityOpen===item.label} onClick={()=>setQualityOpen(current=>current===item.label?null:item.label)} className="flex w-full items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-[#2789D1]"><span className="grid size-10 shrink-0 place-items-center rounded-full" style={{color,background:`${color}1a`}}><Icon className="size-[18px]"/></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3 text-[12px]"><span className="text-[#748399]">{item.label}</span><strong className="font-medium tabular-nums text-[#8190a4]">{item.value}%</strong></div><div role="progressbar" aria-label={item.label} aria-valuenow={item.value} aria-valuemin={0} aria-valuemax={100} className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#edf0f4]"><span className="block h-full rounded-full" style={{width:`${item.value}%`,background:color}}/></div></div></button>{qualityOpen===item.label&&<div className="mt-3 rounded-lg bg-[#A9D2ED]/15 p-3 text-[11px] leading-5 text-[#001B62]" role="status"><strong>{item.label}: {item.value}%.</strong> {item.value>=80?`Supera la meta de 80% por ${item.value-80} puntos porcentuales.`:`Faltan ${80-item.value} puntos porcentuales para alcanzar la meta de 80%.`}</div>}</div>;
        })}</div>
        <p className="mt-5 border-t pt-3 text-[10px] text-[#a68a57]">{view.quality.filter(item=>item.value<80).length} indicadores por debajo de la meta</p>
      </DashboardCard>
      <DashboardCard title="Reportes recientes" subtitle="Últimas publicaciones del observatorio" action={<Link href="/reportes" className="flex items-center gap-1 text-[10px] font-medium text-[#1684a5] hover:underline">Ver todos<ArrowRight className="size-3"/></Link>}>
        <ol className="report-timeline mt-6">{view.reports.slice(0,3).map((report,index) => <li key={report.title} className="relative pb-6 pl-6 last:pb-0"><span className="absolute left-0 top-1 size-2.5 rounded-full" style={{background:colors[index],boxShadow:`0 0 0 4px ${colors[index]}18`,outlineColor:colors[index]}}/><p className="text-[12px] font-medium leading-relaxed">{report.title}</p><p className="mt-1 text-[10px] text-[#8a97a9]">{report.date}</p><Link href="/reportes" className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#f5f7fa] px-2 py-1.5 text-[10px] font-medium text-[#748399] transition hover:bg-[#eaf5f9] hover:text-[#1684a5]"><FileText className="size-3.5"/>Consultar reporte<ArrowRight className="size-3"/></Link></li>)}</ol>
      </DashboardCard>
      <DashboardCard className="quick-actions-card md:col-span-2 xl:col-span-1" title="Acciones rápidas" subtitle="Genera y comparte los resultados">
        <div className="mt-6 space-y-3">
          <Link href="/reportes" className="quick-action"><span className="quick-action-icon bg-[#eaf5f9] text-[#1684a5]"><FilePlus2 className="size-[18px]"/></span><span className="min-w-0 flex-1"><strong>Generar reporte</strong><small>Elegir una plantilla</small></span><ArrowRight className="size-3.5 shrink-0 text-[#a2adba]"/></Link>
          <button type="button" onClick={() => window.print()} className="quick-action"><span className="quick-action-icon bg-[#f0edfa] text-[#8b80cd]"><FileDown className="size-[18px]"/></span><span className="min-w-0 flex-1"><strong>Exportar PDF</strong><small>Guardar o imprimir el panel</small></span><ArrowRight className="size-3.5 shrink-0 text-[#a2adba]"/></button>
          <button type="button" onClick={() => downloadDashboardData(view,filters)} className="quick-action"><span className="quick-action-icon bg-[#eaf6f1] text-[#55ad99]"><ArrowDownToLine className="size-[18px]"/></span><span className="min-w-0 flex-1"><strong>Descargar datos</strong><small>Datos de la vista en CSV</small></span><ArrowRight className="size-3.5 shrink-0 text-[#a2adba]"/></button>
        </div>
        <p className="mt-5 border-t pt-3 text-[10px] leading-relaxed text-[#8a97a9]">La exportación incluye los filtros de la vista actual.</p>
      </DashboardCard>
    </section>
  </div>;
}

function Metric({label,value,suffix,detail,data,color,featured=false,icon:Icon}:{label:string;value:string;suffix?:string;detail:string;data:{value:number}[];color:string;featured?:boolean;icon:typeof BookOpen}) {
  return <article className={`relative min-w-0 overflow-hidden rounded-2xl border p-5 ${featured?"border-[#cce8f0] bg-[#eef8fb]":"border-[#e5eaf0] bg-white"}`}>
    <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-medium text-[#7b899d]">{label}</p><span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{color,background:`${color}12`}}><Icon className="size-4"/></span></div>
    <p className="mt-3 text-[32px] font-semibold leading-none tracking-tight">{value} {suffix&&<span className="text-sm font-normal text-[#9ba7b7]">{suffix}</span>}</p>
    <div className="mt-4 flex items-end justify-between gap-2"><p className="flex items-center gap-1 text-[10px] text-[#5b8e81]">{detail.startsWith("+")&&<ArrowUpRight className="size-3 shrink-0"/>}{detail}</p><div className="h-7 w-20 shrink-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:3,right:0,bottom:0,left:0}}><Tooltip contentStyle={tooltipStyle} formatter={value=>[value,label]}/><Area type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={1.8} fill={color} fillOpacity={.06} dot={false}/></AreaChart></ResponsiveContainer></div></div>
  </article>;
}
function DashboardCard({title,subtitle,action,children,className=""}:{title:string;subtitle:string;action?:React.ReactNode;children:React.ReactNode;className?:string}) {
  return <article className={`min-w-0 rounded-2xl border border-[#e5eaf0] bg-white p-5 shadow-[0_2px_8px_#17325703] sm:p-6 ${className}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-[15px] font-semibold leading-tight tracking-tight">{title}</h2><p className="mt-1.5 text-[11px] leading-relaxed text-[#8a97a9]">{subtitle}</p></div>{action&&<div className="shrink-0">{action}</div>}</div>{children}</article>;
}
