"use client";
import { useId, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { legalClassification, legalDossierLabels, legalJurisdictionLabels, legalLinkLabels, legalSituationLabels, legalSpecificFields, legalThemeOptions, type LegalRecord } from "@/data/legal";
import { LegalIcon, LegalSafeLink, LegalStatus, legalDate, safeLegalHref } from "./legal-ui";

const tabs=[{id:"summary",label:"Resumen"},{id:"timeline",label:"Cronología"},{id:"links",label:"Vínculos"},{id:"municipalities",label:"Municipios"},{id:"documents",label:"Documentos"}] as const;
type Tab=typeof tabs[number]["id"];
const traceLabels:Record<string,string>={create:"Ficha creada",created:"Ficha creada",update:"Ficha actualizada",updated:"Ficha actualizada",submit:"Enviada a revisión",validate:"Revisión validada",corrections:"Correcciones solicitadas",publish:"Revisión publicada",withdraw:"Publicación retirada",archive:"Ficha archivada",upload:"Documento adjunto",document_uploaded:"Documento adjunto",document_removed:"Documento desvinculado"};
function Facts({items}:{items:[string,string|null|undefined][]}) {
  return <dl className="g-kv legal-facts">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||"Sin documentar"}</dd></div>)}</dl>;
}
function TextField({label,value}:{label:string;value:string}) {
  return <div className="legal-text-field"><h3 className="g-h4">{label}</h3><p className="g-p legal-preserve">{value||"Sin documentar"}</p></div>;
}
type LegalRecordViewProps={record:LegalRecord;compact?:boolean;publicView?:boolean};
export function LegalRecordView(props:LegalRecordViewProps) {
  return <LegalRecordContent key={props.record.id} {...props}/>;
}
function LegalRecordContent({record,compact=false,publicView=false}:LegalRecordViewProps) {
  const [tab,setTab]=useState<Tab>("summary");
  const id=useId();
  const classification=legalClassification(record.classification);
  const documents=record.documents.filter(document=>!publicView||document.visibility==="publico");
  const sources=record.sources.filter(source=>!publicView||source.visibility==="publico"||Boolean(source.publicCitation.trim()));
  const links=record.links.filter(link=>link.kind!=="municipalities");
  const municipalities=record.links.filter(link=>link.kind==="municipalities");
  function navigateTab(event:KeyboardEvent<HTMLButtonElement>,index:number) {
    let next=index;
    if(event.key==="ArrowRight")next=(index+1)%tabs.length;
    else if(event.key==="ArrowLeft")next=(index+tabs.length-1)%tabs.length;
    else if(event.key==="Home")next=0;
    else if(event.key==="End")next=tabs.length-1;
    else return;
    event.preventDefault();setTab(tabs[next].id);document.getElementById(id+"-tab-"+tabs[next].id)?.focus();
  }
  return <article className={compact?"g-detail legal-preview":"g-card legal-record"} aria-label={compact?"Ficha seleccionada":"Ficha del instrumento"}>
    <div className="legal-record-heading">
      <span className="g-dot legal-instrument-icon" style={{background:classification.color+"19",color:classification.color}}><LegalIcon name={classification.icon} size={compact?26:32}/></span>
      <div><div className="g-dh"><span className="g-tag" style={{color:classification.color,background:classification.color+"15"}}>{classification.label}</span><LegalStatus record={record}/></div><h2>{record.name}</h2><p className="g-sm">{legalJurisdictionLabels[record.jurisdiction]} · {legalSituationLabels[record.situation]}</p></div>
    </div>
    <Facts items={[["Autoridad",record.authority],["Referencia oficial",record.officialReference],["Publicación",record.publicationDate?legalDate(record.publicationDate):""],["Última actualización",legalDate(record.updatedAt)]]}/>
    {compact&&<Link href={"/proteccion-legal/"+encodeURIComponent(record.id)} className="g-btn legal-full-link">Abrir ficha completa <LegalIcon name="external" size={14}/></Link>}
    <div className="g-tabs" role="tablist" aria-label="Contenido de la ficha">{tabs.map((item,index)=><button key={item.id} id={id+"-tab-"+item.id} type="button" role="tab" aria-label={item.label} aria-description={item.id==="documents"?documents.length+" documentos disponibles":undefined} aria-selected={tab===item.id} aria-controls={id+"-panel-"+item.id} tabIndex={tab===item.id?0:-1} className={tab===item.id?"on":""} onClick={()=>setTab(item.id)} onKeyDown={event=>navigateTab(event,index)}>{item.label}{item.id==="documents"?" ("+documents.length+")":""}</button>)}</div>
    <div id={id+"-panel-"+tab} role="tabpanel" aria-labelledby={id+"-tab-"+tab} tabIndex={0} className="legal-tab-panel">
      {tab==="summary"&&<>
        <TextField label="Descripción" value={record.description}/>
        <TextField label="Alcance documentado" value={record.scope}/>
        {record.thematicAxes.length>0&&<><h3 className="g-h4">Ejes temáticos</h3><div className="g-chips">{record.thematicAxes.map(axis=><span className="g-chip" key={axis}>{legalThemeOptions.find(option=>option.value===axis)?.label||axis}</span>)}</div></>}
        {record.dossier?<section className="legal-dossier"><h3 className="g-h4">Expediente asociado</h3><p className="g-p"><strong>{record.dossier.title||"Expediente documentado"}</strong></p><Facts items={[["Estado del trámite",legalDossierLabels[record.dossier.state]],["Folio",record.dossier.folio],["Fecha de solicitud",record.dossier.requestDate?legalDate(record.dossier.requestDate):""]]}/></section>:<p className="g-sm legal-note">Sin expediente asociado documentado.</p>}
        {!compact&&<>
          <Facts items={[["Vigente desde",record.validFrom?legalDate(record.validFrom):""],["Vigente hasta",record.validUntil?legalDate(record.validUntil):""],["Revisión jurídica",record.reviewDate?legalDate(record.reviewDate):""],["Publicación editorial",record.publishedAt?legalDate(record.publishedAt):""]]}/>
          <div className="legal-reading-grid">
            <TextField label="Materia regulada" value={record.regulatedMatter}/><TextField label="Beneficiarios" value={record.beneficiaries}/><TextField label="Alcance territorial" value={record.territorialScope}/><TextField label="Dependencia responsable" value={record.responsibleAgency}/>
            <TextField label="Presupuesto documentado" value={record.budget}/><TextField label="Reglas de operación" value={record.operatingRules}/><TextField label="Plan de salvaguardia" value={record.safeguardingPlan}/><TextField label="Indicadores de cumplimiento" value={record.complianceIndicators}/>
            <TextField label="Efectividad documentada" value={record.effectiveness}/><TextField label="Retos operativos" value={record.operationalChallenges}/><TextField label="Vacíos y brechas legales" value={record.legalGaps}/><TextField label="Políticas públicas vinculadas" value={record.linkedPolicies}/>
            {legalSpecificFields[record.classification].map(field=><TextField key={field.key} label={field.label} value={record.specificFields[field.key]||""}/>)}
          </div>
          <section className="legal-sources"><h3 className="g-h4">Fuentes y sustento documental</h3>{sources.length===0?<p className="g-p">Sin fuentes documentadas.</p>:sources.map(source=><article className="legal-source" key={source.id}><div className="legal-inline-heading"><h4>{source.title||"Referencia citada"}</h4>{!publicView&&<span className="g-tag">{source.visibility==="publico"?"Pública":"Restringida"}</span>}</div>{(!publicView||source.visibility==="publico")&&<Facts items={[["Referencia",source.reference],["Autoridad",source.authority],["Publicación",source.publicationDate?legalDate(source.publicationDate):""],["Consulta",source.consultedAt?legalDate(source.consultedAt):""]]}/>}{source.publicCitation&&<p className="g-p legal-preserve">{source.publicCitation}</p>}{source.claim&&<p className="g-p legal-preserve"><strong>Afirmación sustentada: </strong>{source.claim}</p>}{source.section&&<p className="g-sm">Sección: {source.section}</p>}{source.url&&<LegalSafeLink href={source.url} className="g-link">Consultar fuente <LegalIcon name="external" size={12}/></LegalSafeLink>}</article>)}</section>
          {!publicView&&<section className="legal-private"><h3 className="g-h4"><LegalIcon name="lock" size={14}/> Notas internas del equipo</h3><p className="g-p legal-preserve">{record.privateNotes||"Sin notas internas."}</p></section>}
        </>}
      </>}
      {tab==="timeline"&&(record.trace.length===0?<p className="g-p">Sin actuaciones registradas para esta consulta.</p>:<ol className="g-tl legal-timeline">{record.trace.map(event=><li key={event.id}><i/><div><strong>{traceLabels[event.action]||event.action}</strong><small>{legalDate(event.date)}{event.actor?" · "+event.actor:""}</small>{event.notes&&<p className="g-p legal-preserve">{event.notes}</p>}</div></li>)}</ol>)}
      {tab==="links"&&<><p className="g-sm legal-note">Las relaciones documentan un vínculo; su existencia no acredita protección jurídica sobre una receta o entidad.</p>{links.length===0?<p className="g-p">Sin vínculos documentados.</p>:links.map(link=><div className="g-row legal-linked-row" key={link.kind+":"+link.origin+":"+link.id}><LegalIcon name={link.kind==="recipes"?"recipe":link.kind==="ingredients"?"leaf":link.kind==="markets"?"stall":"person"}/><div><LegalSafeLink href={link.href}><b>{link.name}</b></LegalSafeLink><small>{legalLinkLabels[link.kind]}</small><p className="g-p legal-preserve">{link.scope}</p><small>Fuente: {sources.find(source=>source.id===link.sourceId)?.title||"Referencia vinculada"}</small></div></div>)}</>}
      {tab==="municipalities"&&<>{record.territorialScope&&<TextField label="Alcance territorial" value={record.territorialScope}/>}<p className="g-sm legal-note">Municipios asociados mediante evidencia documental.</p>{municipalities.length===0?<p className="g-p">Sin municipios vinculados.</p>:municipalities.map(link=><div className="g-row" key={link.origin+":"+link.id}><LegalIcon name="pin"/><div><b>{link.name}</b>{link.municipalityCode&&<small>Clave INEGI: {link.municipalityCode}</small>}<p className="g-p legal-preserve">{link.scope}</p><small>Fuente: {sources.find(source=>source.id===link.sourceId)?.title||"Referencia vinculada"}</small></div></div>)}</>}
      {tab==="documents"&&<div className="g-docs"><p className="g-sm legal-note">La disponibilidad de un documento depende de su visibilidad y de los permisos de consulta.</p>{documents.length===0?<p className="g-p">Sin documentos disponibles.</p>:documents.map(document=><div className="g-row" key={document.id}><LegalIcon name="doc" className="pdf" size={24}/><div><b>{document.name}</b><small>{document.size!==null?(document.size/1024/1024).toFixed(2)+" MB · ":""}{legalDate(document.uploadedAt)} · {document.visibility==="publico"?"Público":"Restringido"}</small><p className="g-sm">Licencia: {document.license||"Sin documentar"}</p></div>{safeLegalHref(document.url)?<LegalSafeLink href={document.url} className="g-btn"><LegalIcon name="download" size={14}/>Descargar<span className="legal-sr-only"> {document.name}</span></LegalSafeLink>:<span className="g-sm">Descarga no disponible</span>}</div>)}</div>}
    </div>
  </article>;
}
