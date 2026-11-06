"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LockKeyhole, Save, Search } from "lucide-react";
import { AdminShell } from "./admin-shell";
import styles from "./administration.module.css";
import { normalizeText } from "@/modules/recipes/recipe-form-controls";
import { accessSections, applicationRoles, defaultAccess, isFixedAccess, readAccess, saveAccess, type AccessMatrix, type RoleId, type SectionId } from "@/data/roles";

export function RolesPanel() {
  const {rol}=useParams<{rol?:string}>();
  const focusedRole=applicationRoles.find(role=>role.id===rol);
  const [saved,setSaved]=useState<AccessMatrix>(defaultAccess);
  const [draft,setDraft]=useState<AccessMatrix>(defaultAccess);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState("");
  const [loadError,setLoadError]=useState(false);
  const [notice,setNotice]=useState("");
  const [search,setSearch]=useState("");
  const [roleFilter,setRoleFilter]=useState("all");
  const shownRoles=applicationRoles.filter(role=>focusedRole?role.id===focusedRole.id:roleFilter==="all"||role.id===roleFilter);
  const sections=accessSections.filter(section=>normalizeText(`${section.name} ${section.description}`).includes(normalizeText(search)));
  const dirty=JSON.stringify(draft)!==JSON.stringify(saved);
  useEffect(()=>{
    let cancelled=false;
    Promise.resolve().then(()=>{
      if(cancelled)return;
      try{const matrix=readAccess();setSaved(matrix);setDraft(matrix);}
      catch{setError("No se pudo cargar la configuración. Recarga la página para intentarlo de nuevo.");setLoadError(true);}
      finally{setLoaded(true);}
    });
    return()=>{cancelled=true;};
  },[]);
  useEffect(()=>{
    if(!dirty)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);
    return()=>window.removeEventListener("beforeunload",warn);
  },[dirty]);
  const toggle=(section:SectionId,role:RoleId)=>{
    setDraft(current=>({...current,[section]:{...current[section],[role]:!current[section][role]}}));
    setNotice("");setError("");
  };
  const save=()=>{
    try{const matrix=saveAccess(draft);setSaved(matrix);setDraft(matrix);setError("");setNotice("Configuración guardada.");}
    catch{setError("No se pudo guardar la configuración. Tus cambios siguen disponibles para volver a intentarlo.");}
  };
  const cancel=()=>{setDraft(saved);setError("");setNotice("Cambios descartados.");};
  if(rol&&!focusedRole)return <AdminShell section="Permisos"><p>No encontramos ese rol.</p><Link href="/administracion/roles">Volver a roles</Link></AdminShell>;
  return <AdminShell section="Permisos"><header className="acervo-heading"><div><h2>{focusedRole?`Permisos de ${focusedRole.name}`:"Acceso a las secciones"}</h2><p>Activa o desactiva las secciones que puede consultar cada rol.</p></div><div className="flex items-center gap-2"><button type="button" disabled={!loaded||!dirty||loadError} onClick={cancel} className="acervo-secondary">Descartar</button><button type="button" disabled={!loaded||!dirty||loadError} onClick={save} className="acervo-primary"><Save size={14}/>Guardar cambios</button></div></header>
  <section className="acervo-card overflow-hidden" aria-label="Permisos por sección"><div className="recipe-catalog-toolbar"><div className="relative w-full sm:max-w-[290px]"><Search size={15} className="absolute left-3 top-3 text-[#001B62]/40"/><input className="acervo-input h-9 w-full !pl-9" aria-label="Buscar sección" placeholder="Buscar sección…" value={search} onChange={event=>setSearch(event.target.value)}/></div>{!focusedRole&&<label className={styles.roleFilter}><span className="text-[11px] text-[#001B62]/60">Mostrar</span><select aria-label="Filtrar permisos por rol" className="acervo-input h-9" value={roleFilter} onChange={event=>setRoleFilter(event.target.value)}><option value="all">Todos los roles</option>{applicationRoles.map(role=><option value={role.id} key={role.id}>{role.name}</option>)}</select></label>}<span role="status" className="text-[11px] text-[#001B62]/60">{!loaded?'Cargando…':dirty?'Cambios sin guardar':notice||`${sections.length} secciones`}</span></div>
  {error&&<p role="alert" className="mx-5 mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
  <div className="overflow-x-auto"><table className={`${styles.table} ${styles.permissionTable}`}><thead><tr><th scope="col">Sección del observatorio</th>{shownRoles.map(role=><th key={role.id} scope="col">{role.name}</th>)}</tr></thead><tbody>{sections.map(section=><tr key={section.id}><td><strong className="flex items-center gap-2">{section.name}{isFixedAccess(section.id)&&<LockKeyhole size={12} className="text-[#001B62]/40"/>}</strong><small>{section.description}</small></td>{shownRoles.map(role=><td key={role.id}><button type="button" role="switch" aria-checked={draft[section.id][role.id]} disabled={!loaded||loadError||isFixedAccess(section.id)} aria-label={`${role.name}: acceso a ${section.name}`} title={isFixedAccess(section.id)?"Solo el administrador puede gestionar roles.":undefined} onClick={()=>toggle(section.id,role.id)} className={styles.toggle}><span/></button></td>)}</tr>)}</tbody></table>{!sections.length&&<p className="py-12 text-center text-xs text-[#001B62]/60">No encontramos esa sección.</p>}</div><footer className={styles.cardFooter}><span className="inline-flex items-center gap-2"><LockKeyhole size={12}/>Roles y permisos: exclusivo del administrador.</span><span>Configuración de accesos guardada en este navegador.</span></footer></section></AdminShell>;
}
