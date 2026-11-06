"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Users, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { ObservatorySidebar } from "@/components/dashboard/observatory-sidebar";
import styles from "./administration.module.css";
export function AdminShell({children,section}:{children:ReactNode;section?:string}) {
 const active=section==='Personas'?'personas':section==='Permisos'?'permisos':'roles';
 return <div className="acervo-page min-h-screen"><ObservatorySidebar activeItem="Roles y permisos"/><main className="admin-main"><div className={styles.workspace}><p className={styles.breadcrumb}>Administración <span>/</span> Equipo y accesos</p><header className={styles.heading}><div><h1>Roles y permisos</h1><p>Gestiona a tu equipo y organiza sus accesos en un solo lugar.</p></div><span className={styles.adminBadge}><ShieldCheck size={14}/>Solo administrador</span></header><nav className={styles.tabs} aria-label="Gestión del equipo">{[{id:'personas',label:'Personas',href:'/administracion/personas',Icon:Users},{id:'roles',label:'Roles',href:'/administracion/roles',Icon:ShieldCheck},{id:'permisos',label:'Permisos',href:'/administracion/roles/accesos',Icon:SlidersHorizontal}].map(({id,label,href,Icon})=><Link href={href} key={id} aria-current={active===id?'page':undefined}><Icon size={16}/>{label}</Link>)}</nav>{children}</div></main></div>;
}
export function AdminBack(){return <Link href="/administracion/roles" aria-label="Volver a Roles" className="acervo-secondary size-9 !p-0"><ArrowLeft className="size-4"/></Link>;}
export function memberName(name:string){return name.trim().replace(/(^|[\s-])(\p{L})/gu,(_,space:string,letter:string)=>space+letter.toLocaleUpperCase('es-MX'));}
export function MemberAvatar({name}:{name:string}){return <span className={styles.avatar} aria-hidden="true">{Array.from(name.trim())[0]?.toLocaleUpperCase('es-MX')??'?'}</span>;}
