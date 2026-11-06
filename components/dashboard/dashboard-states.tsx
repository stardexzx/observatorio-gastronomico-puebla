"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoading() {
  return <div aria-label="Actualizando datos" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">{Array.from({length:7}).map((_,index)=><Card key={index} className="gap-3 rounded-2xl p-4"><Skeleton className="size-10 rounded-xl"/><Skeleton className="h-7 w-20"/><Skeleton className="h-3 w-28"/></Card>)}</div>;
}

export class DashboardErrorBoundary extends Component<{children:ReactNode},{hasError:boolean}> {
  state={hasError:false};
  static getDerivedStateFromError(){ return {hasError:true}; }
  componentDidCatch(error:Error, info:ErrorInfo){ console.error("Dashboard error", error, info); }
  render(){
    if(this.state.hasError) return <Card className="rounded-2xl border-red-200"><CardContent className="flex min-h-72 flex-col items-center justify-center text-center"><span className="grid size-12 place-items-center rounded-xl bg-red-50 text-red-600"><AlertTriangle/></span><h2 className="mt-4 text-xl font-bold text-slate-800">No pudimos cargar el dashboard</h2><p className="mt-2 max-w-md text-sm text-slate-500">Los datos locales no se procesaron correctamente. Puedes intentar cargar la vista nuevamente.</p><Button className="mt-5" onClick={()=>window.location.reload()}>Volver a cargar</Button></CardContent></Card>;
    return this.props.children;
  }
}
