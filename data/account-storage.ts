/* eslint-disable @next/next/no-location-assign-relative-destination -- Authentication changes discard cached user state. */
import type { TeamMember } from './team-members';
import type { RoleId } from './roles';
export { isRole,type TeamMember } from './team-members';
async function request(input?:Record<string,unknown>):Promise<TeamMember[]>{
 const response=await fetch('/api/administracion/personas',input?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{cache:'no-store'});
 const body=await response.json() as {members?:TeamMember[];error?:string;reauthenticate?:boolean};
 if(!response.ok)throw new Error(body.error??'No se pudo completar la solicitud.');
 if(body.reauthenticate){window.location.assign('/iniciar-sesion');return [];}
 return body.members??[];
}
export const readMembers=()=>request();
export const saveMember=(input:{id?:string;name:string;email:string;role:RoleId|null;password?:string})=>request({action:'save',...input});
export const assignMemberRole=(ids:string[],role:RoleId|null)=>request({action:'role',ids,role});
export const assignPassword=(id:string,password:string)=>request({action:'password',id,password});

export const deleteMember=(id:string)=>request({action:'delete',id});
