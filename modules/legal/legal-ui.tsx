import type { ReactNode } from "react";
import { legalDisplayStatus, legalEditorialLabels, type LegalRecord } from "@/data/legal";

export function LegalIcon({name,size=18,className=""}:{name:string;size?:number;className?:string}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}><use href={"#ic-"+name}/></svg>;
}
export function legalDate(value:string|null|undefined):string {
  if(!value)return "Sin documentar";
  const date=new Date(value.length===10?value+"T12:00:00Z":value);
  return Number.isNaN(date.getTime())?"Sin documentar":new Intl.DateTimeFormat("es-MX",{day:"2-digit",month:"short",year:"numeric",timeZone:"UTC"}).format(date);
}
export function safeLegalHref(value:string|undefined):string|undefined {
  if(!value)return undefined;
  if(value.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\"))return value;
  try { const url=new URL(value); return url.protocol==="https:"||url.protocol==="http:"?url.href:undefined; } catch { return undefined; }
}
export function LegalSafeLink({href,children,className=""}:{href?:string;children:ReactNode;className?:string}) {
  const safe=safeLegalHref(href);
  return safe?<a href={safe} className={className} {...(safe.startsWith("/")?{}:{target:"_blank",rel:"noopener noreferrer"})}>{children}</a>:<span className={className}>{children}</span>;
}
export function LegalStatus({record}:{record:Pick<LegalRecord,"status"|"published">}) {
  return <span className="legal-status"><span className={"g-tag "+(record.published?"ok":record.status==="archivado"?"red":record.status==="validado"?"blue":"warn")}>{legalDisplayStatus(record)}</span>{record.published&&record.status!=="publicado"&&<small>Edición: {legalEditorialLabels[record.status]}</small>}</span>;
}
export class LegalRequestError extends Error {
  fields:Record<string,string>;
  status:number;
  constructor(message:string,status:number,fields:Record<string,string>={}) {super(message);this.name="LegalRequestError";this.status=status;this.fields=fields;}
}
export async function legalRequest<T>(url:string,init?:RequestInit):Promise<T> {
  const response=await fetch(url,{...init,cache:"no-store",credentials:"same-origin"});
  const data=await response.json().catch(()=>null) as Record<string,unknown>|null;
  if(!response.ok) {
    const raw=data?.error;
    const message=typeof raw==="string"?raw:typeof data?.message==="string"?data.message:"No se pudo completar la operación. Intenta de nuevo.";
    const fields:Record<string,string>={};
    const source=data?.fields??data?.fieldErrors;
    if(Array.isArray(data?.issues))for(const issue of data.issues)if(issue&&typeof issue==="object"&&"path" in issue&&"message" in issue)fields[String(issue.path)]=String(issue.message);
    if(source&&typeof source==="object")for(const [key,value]of Object.entries(source))fields[key]=Array.isArray(value)?value.join(" "):String(value);
    throw new LegalRequestError(message,response.status,fields);
  }
  if(!data)throw new LegalRequestError("El servidor no devolvió una respuesta válida.",response.status);
  return data as T;
}
