import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function MetricCard({ label, value, change, icon: Icon, color, tint, muted = false }: { label: string; value: string; change: string; icon: LucideIcon; color: string; tint: string; muted?:boolean }) {
  return <Card className={`group gap-0 overflow-hidden rounded-[14px] border bg-white py-0 shadow-none transition-transform hover:-translate-y-0.5 ${muted?"opacity-45 grayscale-[35%]":""}`}><CardContent className="p-3">
    <div className="flex items-start justify-between gap-2"><span className="text-[10px] font-medium leading-3.5 text-[#66758d]">{label}</span><span className="grid size-7 shrink-0 place-items-center rounded-[9px]" style={{background:tint,color}}><Icon className="size-[14px]"/></span></div>
    <p className="mt-2 text-[22px] font-bold tracking-[-.04em] text-[#10284b]">{value}</p><p className="mt-0.5 truncate text-[8px] font-medium" style={{color}}>{change} <span className="font-normal text-[#98a3b7]">vs. anterior</span></p>
  </CardContent></Card>;
}
