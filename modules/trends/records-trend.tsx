"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useDashboard } from "@/components/dashboard/dashboard-context";

export function RecordsTrend() {
  const { view } = useDashboard();
  const current = view.records.at(-1)?.records ?? 0;
  return <Card className="gap-3 rounded-[24px] border-0 bg-white shadow-none"><CardHeader className="flex-row items-start justify-between px-6 pb-0 pt-6"><div><CardTitle className="text-base text-[#10284b]">Registros históricos acumulados</CardTitle><p className="mt-1 text-xs text-[#8792a7]">Evolución del patrimonio documentado</p></div><div className="text-right"><p className="text-2xl font-bold text-[#10284b]">{current.toLocaleString("es-MX")}</p><p className="text-xs font-semibold text-[#159b67]">+12.4% vs. periodo anterior</p></div></CardHeader><CardContent className="px-3 pb-4 sm:px-5"><ChartContainer config={{ records:{label:"Registros",color:"#3f6ff2"} }} className="h-[250px] w-full"><AreaChart data={view.records} margin={{top:12,right:10,left:-18,bottom:0}}><defs><linearGradient id="recordsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3f6ff2" stopOpacity={0.25}/><stop offset="100%" stopColor="#3f6ff2" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e9edf4"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill:"#8491a3",fontSize:10}} dy={8}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#8491a3",fontSize:10}}/><ChartTooltip content={<ChartTooltipContent/>}/><Area type="monotone" dataKey="records" name="Registros" stroke="#3f6ff2" strokeWidth={3} fill="url(#recordsFill)" activeDot={{r:5,fill:"#3f6ff2",stroke:"white",strokeWidth:2}}/></AreaChart></ChartContainer></CardContent></Card>;
}
