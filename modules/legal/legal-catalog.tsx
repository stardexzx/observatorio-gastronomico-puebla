"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { legalClassification, legalClassificationOptions, legalJurisdictionLabels, legalSituationLabels, type LegalCatalog as LegalCatalogData, type LegalSummary } from "@/data/legal";
import { LegalRecordView } from "./legal-record-view";
import { LegalIcon, LegalStatus, legalDate, legalRequest } from "./legal-ui";

function LegalIndicators({summary}:{summary:LegalSummary}) {
  const coverage=summary.municipalityTotal>0?Math.round(summary.coveredMunicipalities/summary.municipalityTotal*100):null;
  const other=Math.max(0,summary.total-summary.granted-summary.inProgress-summary.evaluation-summary.rejected);
  const pipeline=[{label:"Total de expedientes",value:summary.total,icon:"folder",color:"#10284C"},{label:"Favorables",value:summary.granted,icon:"check",color:"#4F7A4A"},{label:"En trámite",value:summary.inProgress,icon:"history",color:"#D89A2E"},{label:"En evaluación",value:summary.evaluation,icon:"search",color:"#3E6FA8"},{label:"Rechazados",value:summary.rejected,icon:"x",color:"#B23A1F"}];
  return <>
    <section className="g-kpis c5" aria-label="Indicadores de protección legal">
      <div className="g-kpi"><span className="g-dot" style={{background:"#EAE4F1",color:"#7A5EA8"}}><LegalIcon name="shield" size={20}/></span><b>{summary.active}</b><small>Instrumentos vigentes</small><em>Vigencia documentada</em></div>
      <div className="g-kpi"><span className="g-dot" style={{background:"#FBEDD5",color:"#D89A2E"}}><LegalIcon name="folder" size={20}/></span><b>{summary.inProgress}</b><small>Expedientes en trámite</small><em>Solicitudes y requerimientos</em></div>
      <div className="g-kpi"><span className="g-dot" style={{background:"#EAF0E7",color:"#4F7A4A"}}><LegalIcon name="recipe" size={20}/></span><b>{summary.protectedRecipes}</b><small>Recetas vinculadas</small><em>Relaciones documentadas</em></div>
      <div className="g-kpi"><span className="g-dot" style={{background:"#E2F0EE",color:"#2E8A82"}}><LegalIcon name="pin" size={20}/></span><b>{summary.coveredMunicipalities}</b><small>Municipios vinculados</small><em>{coverage===null?"Catálogo municipal sin total disponible":coverage+"% de "+summary.municipalityTotal+" municipios"}</em></div>
      <div className="g-kpi"><span className="g-dot" style={{background:"#E8EEF6",color:"#3E6FA8"}}><LegalIcon name="calendar" size={20}/></span><b className="legal-kpi-date">{summary.lastUpdates[0]?legalDate(summary.lastUpdates[0].date):"Sin registros"}</b><small>Últimas actualizaciones</small><em>{summary.lastUpdates[0]?.name||"Sin movimientos documentados"}</em></div>
    </section>
    <section className="g-card legal-pipeline" aria-label="Estado de expedientes">
      <div className="g-ch"><h2>Estado de los expedientes</h2><span className="g-sm">Trámites distintos documentados</span></div>
      <div className="g-pipe">{pipeline.map(step=><div className="g-pstep" key={step.label}><span className="g-dot" style={{background:step.color+"16",color:step.color}}><LegalIcon name={step.icon} size={21}/></span><b>{step.value}</b><small>{step.label}</small></div>)}</div>
      <p className="g-sm legal-pipeline-note">{other>0?other+" expediente"+(other===1?"":"s")+" en otros estados (desistido o no documentado).":"Sin expedientes en otros estados."} Un instrumento puede existir sin expediente asociado.</p>
    </section>
  </>;
}
function normalize(value:string) {return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
export function LegalCatalog({publicView=false,canCreate=false}:{publicView?:boolean;canCreate?:boolean}) {
  const [catalog,setCatalog]=useState<LegalCatalogData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [reload,setReload]=useState(0);
  const [query,setQuery]=useState("");
  const [classification,setClassification]=useState("");
  const [jurisdiction,setJurisdiction]=useState("");
  const [situation,setSituation]=useState("");
  const [selectedId,setSelectedId]=useState("");
  const [page,setPage]=useState(1);
  useEffect(()=>{
    const controller=new AbortController();
    Promise.resolve().then(async()=>{
      if(controller.signal.aborted)return;
      setLoading(true);setError("");
      const data=await legalRequest<LegalCatalogData>(publicView?"/api/public/legal":"/api/legal",{signal:controller.signal});
      if(controller.signal.aborted)return;
      if(!Array.isArray(data.records)||!data.summary)throw new Error("El catálogo no tiene el formato esperado.");
      setCatalog(data);
    }).catch(error=>{if(!controller.signal.aborted){setCatalog(null);setError(error instanceof Error?error.message:"No se pudo cargar el catálogo.");}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[publicView,reload]);
  const matches=useMemo(()=>(catalog?.records||[]).filter(record=>
    (!classification||record.classification===classification)&&(!jurisdiction||record.jurisdiction===jurisdiction)&&(!situation||record.situation===situation)&&(!query.trim()||normalize([record.name,record.authority,record.officialReference,record.description,record.dossier?.folio||""].join(" ")).includes(normalize(query.trim())))
  ).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),[catalog,classification,jurisdiction,situation,query]);
  const pages=Math.max(1,Math.ceil(matches.length/8));
  const currentPage=Math.min(page,pages);
  const rows=matches.slice((currentPage-1)*8,currentPage*8);
  const selected=rows.find(record=>record.id===selectedId)||rows[0];
  function clearFilters(){setQuery("");setClassification("");setJurisdiction("");setSituation("");setPage(1);}
  return <>
    <header className="legal-heading"><div><p className="legal-eyebrow">Observatorio Gastronómico de Puebla</p><h1>Protección legal</h1><p>Instrumentos, expedientes y evidencia del patrimonio gastronómico.</p>{publicView&&<span className="g-tag blue">Consulta pública de fichas autorizadas</span>}</div><div className="legal-actions">{canCreate&&<Link className="g-btn p" href="/proteccion-legal/nuevo"><LegalIcon name="plus" size={16}/>Nueva ficha</Link>}<button className="g-btn" type="button" disabled={loading} onClick={()=>setReload(value=>value+1)}><LegalIcon name="history" size={15}/>Actualizar</button></div></header>
    {loading&&<p role="status" className="legal-loading">Cargando instrumentos y expedientes…</p>}
    {error&&<div role="alert" className="legal-error"><p>{error}</p><button className="g-btn" type="button" onClick={()=>setReload(value=>value+1)}>Reintentar</button></div>}
    {catalog&&<>
      <LegalIndicators summary={catalog.summary}/>
      <div className="g-filters legal-filters" aria-label="Filtros del catálogo">
        <label className="g-input"><LegalIcon name="search" size={17}/><span className="legal-sr-only">Buscar instrumentos</span><input type="search" value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}} placeholder="Buscar nombre, autoridad o referencia…"/></label>
        <label className="g-sel"><span>Clasificación</span><select aria-label="Clasificación" value={classification} onChange={event=>{setClassification(event.target.value);setPage(1);}}><option value="">Todas las clasificaciones</option>{legalClassificationOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="g-sel"><span>Jurisdicción</span><select aria-label="Jurisdicción" value={jurisdiction} onChange={event=>{setJurisdiction(event.target.value);setPage(1);}}><option value="">Todos los ámbitos</option>{Object.entries(legalJurisdictionLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label className="g-sel"><span>Situación jurídica</span><select aria-label="Situación jurídica" value={situation} onChange={event=>{setSituation(event.target.value);setPage(1);}}><option value="">Todas las situaciones</option>{Object.entries(legalSituationLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        {(query||classification||jurisdiction||situation)&&<button type="button" className="g-btn" onClick={clearFilters}>Limpiar filtros</button>}
      </div>
      <div className="g-split legal-catalog-split">
        <section className="g-card legal-catalog-table">
          <div className="g-ch"><h2>Catálogo de instrumentos</h2><span className="g-sm" role="status">{matches.length} ficha{matches.length===1?"":"s"}</span></div>
          {matches.length===0?<div className="legal-empty"><LegalIcon name="shield" size={34}/><h3>{catalog.records.length===0?"Sin instrumentos registrados":"No hay coincidencias"}</h3><p>{catalog.records.length===0?(publicView?"Las fichas autorizadas aparecerán aquí cuando se publiquen.":"Agrega una ficha con su información y evidencia documental."):"Ajusta la búsqueda o los filtros para consultar otras fichas."}</p>{catalog.records.length>0&&<button type="button" className="g-btn" onClick={clearFilters}>Limpiar filtros</button>}</div>:<>
            <div className="legal-table-scroll"><table className="g-tbl" aria-label="Instrumentos legales"><thead><tr><th scope="col">Instrumento</th><th scope="col">Tipo</th><th scope="col">Jurisdicción</th><th scope="col">Estado</th><th scope="col">Publicación</th><th scope="col">Autoridad</th><th scope="col">Verificación editorial</th></tr></thead><tbody>{rows.map(record=>{const type=legalClassification(record.classification);return <tr key={record.id} className={selected?.id===record.id?"sel":""}><td><button type="button" className="nm legal-select-record" aria-pressed={selected?.id===record.id} onClick={()=>setSelectedId(record.id)}><span className="g-dot" style={{background:type.color+"17",color:type.color}}><LegalIcon name={type.icon} size={20}/></span><span>{record.name}<small>{record.officialReference||"Referencia sin documentar"}</small></span></button></td><td><span className="g-tag" style={{color:type.color,background:type.color+"16"}} title={type.label}>{type.short}</span></td><td>{legalJurisdictionLabels[record.jurisdiction]}</td><td><LegalStatus record={record}/><small className="legal-cell-note">{legalSituationLabels[record.situation]}</small></td><td>{record.publicationDate?legalDate(record.publicationDate):"Sin documentar"}</td><td>{record.authority||"Sin documentar"}</td><td>{record.published||record.status==="validado"?<span className="g-ver"><LegalIcon name="check" size={13}/>Revisión autorizada</span>:<span className="g-ver pend"><LegalIcon name="history" size={13}/>Pendiente de autorización</span>}</td></tr>;})}</tbody></table></div>
            <nav className="legal-pagination" aria-label="Paginación de instrumentos"><span>{(currentPage-1)*8+1}–{Math.min(currentPage*8,matches.length)} de {matches.length}</span><div><button type="button" className="g-btn" disabled={currentPage===1} onClick={()=>{setPage(currentPage-1);setSelectedId("");}}>Anterior</button><span>Página {currentPage} de {pages}</span><button type="button" className="g-btn" disabled={currentPage===pages} onClick={()=>{setPage(currentPage+1);setSelectedId("");}}>Siguiente</button></div></nav>
          </>}
        </section>
        {selected?<LegalRecordView key={selected.id} record={selected} compact publicView={publicView}/>:<aside className="g-detail legal-empty" aria-label="Ficha seleccionada"><LegalIcon name="doc" size={32}/><p>Selecciona un instrumento para consultar su ficha.</p></aside>}
      </div>
      {catalog.summary.lastUpdates.length>1&&<section className="g-card legal-recent"><div className="g-ch"><h2>Últimas actualizaciones</h2></div>{catalog.summary.lastUpdates.slice(0,5).map(update=><div className="g-row" key={update.id}><LegalIcon name="history" size={16}/><div><Link href={"/proteccion-legal/"+encodeURIComponent(update.id)}><b>{update.name}</b></Link><small>{legalDate(update.date)}</small></div></div>)}</section>}
    </>}
  </>;
}
