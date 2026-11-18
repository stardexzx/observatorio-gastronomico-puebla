"use client";
import { useState } from "react";
import { legalDisplayStatus, type LegalRecord, type LegalWorkflowAction } from "@/data/legal";
import { LegalStatus, legalRequest } from "./legal-ui";

export function LegalWorkflowControls({record,onChange,disabled=false}:{record:LegalRecord;onChange:(record:LegalRecord)=>void;disabled?:boolean}) {
  const [notes,setNotes]=useState("");
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const capabilities=record.capabilities;
  const hasActions=capabilities.submit||capabilities.review||capabilities.publish||capabilities.withdraw||capabilities.archive;
  if(!hasActions&&!record.hasUnsubmittedChanges)return null;
  async function act(action:LegalWorkflowAction|"archive") {
    if(busy||disabled)return;
    setError("");setMessage("");
    if(action==="corrections"&&!notes.trim()){setError("Escribe las observaciones necesarias para solicitar correcciones.");return;}
    if(action==="withdraw"&&!window.confirm("¿Retirar la publicación? La ficha dejará de estar disponible para consulta pública y conservará su historial."))return;
    if(action==="archive"&&!window.confirm("¿Archivar esta ficha? Se conservará el historial y se retirará su publicación."))return;
    setBusy(action);
    try {
      const {record:updated}=await legalRequest<{record:LegalRecord}>("/api/legal/"+encodeURIComponent(record.id)+(action==="archive"?"":"/workflow"),action==="archive"?{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,notes:notes.trim(),...(record.latestRevisionId?{revisionId:record.latestRevisionId}:{})})});
      onChange(updated);setNotes("");
      setMessage("Operación registrada. Estado actual: "+legalDisplayStatus(updated)+".");
    } catch(error) {setError(error instanceof Error?error.message:"No se pudo registrar la operación.");}
    finally {setBusy("");}
  }
  return <section className="legal-workflow g-card" aria-label="Gestión editorial">
    <div className="g-ch"><h2>Gestión editorial</h2><LegalStatus record={record}/></div>
    <div className="legal-card-body">
      {record.published&&record.status!=="publicado"&&<p className="g-p">La versión publicada sigue disponible mientras se revisa la edición actual.</p>}
      {record.hasUnsubmittedChanges&&<p className="legal-note g-p" role="status">Hay cambios posteriores a la validación. Envía la ficha a revisión antes de publicar.</p>}
      {hasActions&&<><label className="legal-field"><span>Observaciones editoriales</span><textarea value={notes} onChange={event=>setNotes(event.target.value)} rows={3} maxLength={10000} disabled={!!busy||disabled} placeholder="Obligatorias para solicitar correcciones" aria-describedby="legal-workflow-help"/></label>
      <p id="legal-workflow-help" className="g-sm">Las acciones disponibles dependen de tus permisos y del estado confirmado por el servidor.</p></>}
      {error&&<p role="alert" className="legal-error">{error}</p>}
      {message&&<p role="status" className="legal-success">{message}</p>}
      <div className="legal-actions">
        {capabilities.submit&&<button type="button" className="g-btn" disabled={!!busy||disabled} onClick={()=>act("submit")}>Enviar a revisión</button>}
        {capabilities.review&&<><button type="button" className="g-btn" disabled={!!busy||disabled} onClick={()=>act("validate")}>Validar revisión</button><button type="button" className="g-btn" disabled={!!busy||disabled} onClick={()=>act("corrections")}>Solicitar correcciones</button></>}
        {capabilities.publish&&<button type="button" className="g-btn p" disabled={!!busy||disabled} onClick={()=>act("publish")}>Publicar revisión</button>}
        {capabilities.withdraw&&<button type="button" className="g-btn" disabled={!!busy||disabled} onClick={()=>act("withdraw")}>Retirar publicación</button>}
        {capabilities.archive&&<button type="button" className="g-btn legal-danger" disabled={!!busy||disabled} onClick={()=>act("archive")}>Archivar ficha</button>}
      </div>
      {!!busy&&<p role="status" className="g-sm">Registrando operación…</p>}
    </div>
  </section>;
}
