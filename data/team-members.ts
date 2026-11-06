import { applicationRoles, type RoleId } from "./roles";
export type TeamMember={id:string;name:string;email:string;role:RoleId|null;createdAt:string};
const key="observatorio-team-members-v1";
export function isRole(value:unknown):value is RoleId {return applicationRoles.some(role=>role.id===value);}
export function readMembers():TeamMember[] {
  const raw=window.localStorage.getItem(key);
  if(!raw)return [];
  const value:unknown=JSON.parse(raw);
  if(!Array.isArray(value)||value.some(item=>!item||typeof item.id!=="string"||typeof item.name!=="string"||typeof item.email!=="string"||!(item.role===null||isRole(item.role))||typeof item.createdAt!=="string"))throw new Error("No se pudo leer el equipo.");
  return value;
}
function writeMembers(members:TeamMember[]) {window.localStorage.setItem(key,JSON.stringify(members));return members;}
export function saveMember(input:{id?:string;name:string;email:string;role:RoleId|null}):TeamMember[] {
  const members=readMembers();
  const name=input.name.trim();const email=input.email.trim().toLowerCase();
  if(!name)throw new Error("Escribe el nombre de la persona.");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Escribe un correo válido.");
  if(input.role!==null&&!isRole(input.role))throw new Error("Selecciona uno de los tres roles disponibles.");
  if(members.some(member=>member.email.toLowerCase()===email&&member.id!==input.id))throw new Error("Este correo ya está registrado en el equipo.");
  const existing=members.find(member=>member.id===input.id);
  if(input.id&&!existing)throw new Error("No encontramos a la persona. Recarga el equipo.");
  const saved:TeamMember={id:existing?.id??crypto.randomUUID(),name,email,role:input.role,createdAt:existing?.createdAt??new Date().toISOString()};
  return writeMembers(existing?members.map(member=>member.id===saved.id?saved:member):[...members,saved]);
}
export function assignMemberRole(ids:string[],role:RoleId|null):TeamMember[] {
  if(role!==null&&!isRole(role))throw new Error("Selecciona un rol válido.");
  const members=readMembers();
  if(!ids.length||ids.some(id=>!members.some(member=>member.id===id)))throw new Error("Selecciona personas del equipo antes de asignar un rol.");
  return writeMembers(members.map(member=>ids.includes(member.id)?{...member,role}:member));
}
