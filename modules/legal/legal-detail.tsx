"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { LegalRecord } from "@/data/legal";
import { LegalEditor } from "./legal-editor";
import { LegalRecordView } from "./legal-record-view";
import { LegalWorkflowControls } from "./legal-workflow-controls";
import { LegalIcon, legalRequest } from "./legal-ui";

function useLegalRecord(id:string,publicView:boolean) {
  const [record,setRecord]=useState<LegalRecord|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError("");setRecord(null);
    legalRequest<{record:LegalRecord}>((publicView?"/api/public/legal/":"/api/legal/")+encodeURIComponent(id),{signal:controller.signal}).then(data=>{
      if(!data.record?.id)throw new Error("La respuesta del servidor no contiene una ficha válida.");
      setRecord(data.record);
    }).catch(error=>{if(!controller.signal.aborted)setError(error instanceof Error?error.message:"No se pudo consultar la ficha.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[id,publicView,retry]);
  return {record,setRecord,error,loading,retry:()=>setRetry(value=>value+1)};
}
function LoadState({loading,error,retry}:{loading:boolean;error:string;retry:()=>void}) {
  if(loading)return <p role="status" className="legal-loading">Cargando ficha jurídica…</p>;
  return <div className="legal-error" role="alert"><p>{error||"No se encontró la ficha solicitada."}</p><button className="g-btn" onClick={retry} type="button">Reintentar</button></div>;
}
export function LegalDetail({id,publicView=false}:{id:string;publicView?:boolean}) {
  const state=useLegalRecord(id,publicView);
  return <>
    <header className="legal-heading"><div><Link href="/proteccion-legal" className="g-link">← Volver al catálogo</Link><h1>Ficha de protección legal</h1><p>Información, evidencia y vínculos del instrumento.</p></div>{state.record?.capabilities.edit&&!publicView&&<Link className="g-btn p" href={"/proteccion-legal/"+encodeURIComponent(id)+"/editar"}><LegalIcon name="doc" size={16}/>Editar ficha</Link>}</header>
    {!state.record?<LoadState loading={state.loading} error={state.error} retry={state.retry}/>:<><LegalRecordView record={state.record} publicView={publicView}/>{!publicView&&<LegalWorkflowControls record={state.record} onChange={state.setRecord}/>}</>}
  </>;
}
export function LegalEditLoader({id}:{id:string}) {
  const state=useLegalRecord(id,false);
  if(!state.record)return <><header className="legal-heading"><div><Link href="/proteccion-legal" className="g-link">← Volver al catálogo</Link><h1>Editar protección legal</h1></div></header><LoadState loading={state.loading} error={state.error} retry={state.retry}/></>;
  if(!state.record.capabilities.edit)return <section className="g-card legal-empty"><h1>Edición no disponible</h1><p>Tu cuenta no tiene permiso para editar esta ficha en su estado actual.</p><Link className="g-btn" href={"/proteccion-legal/"+encodeURIComponent(id)}>Consultar ficha</Link></section>;
  return <LegalEditor key={state.record.id} record={state.record}/>;
}
