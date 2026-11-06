import "server-only";
import { pool } from "@/db/postgres";
import { AuthFailure } from "./accounts";
import { hashPassword, tokenHash, validPassword } from "./passwords";
import type { SessionUser } from "./types";
const roles=['administrador','capturista','revisor'];
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
export async function listAccounts(){
 const {rows}=await pool.query(`SELECT u.id,u.nombre AS name,u.correo AS email,u.creado_en AS "createdAt",
 (SELECT r.codigo FROM ogp.usuario_roles ur JOIN ogp.roles r ON r.id=ur.rol_id WHERE ur.usuario_id=u.id AND r.activo AND r.codigo=ANY($1) ORDER BY CASE r.codigo WHEN 'administrador' THEN 0 WHEN 'revisor' THEN 1 ELSE 2 END LIMIT 1) AS role
 FROM ogp.usuarios u JOIN app_auth.credentials c ON c.usuario_id=u.id WHERE u.estado='activo' ORDER BY u.nombre,u.id`,[roles]);return rows;
}
export async function manageAccount(actor:SessionUser,input:Record<string,unknown>){
 if(actor.role!=='administrador')throw new AuthFailure('Acceso no permitido.',403);
 const action=input.action;
 if(!['save','role','password','delete'].includes(String(action)))throw new AuthFailure('Solicitud no válida.',400);
 const role=input.role;
 if(action!=='password'&&action!=='delete'&&role!==null&&!roles.includes(String(role)))throw new AuthFailure('Selecciona un rol válido.',400);
 const isNew=action==='save'&&!input.id;
 const ids=action==='role'?input.ids: isNew?[]:[input.id];
 if(!Array.isArray(ids)||ids.length>100||(!isNew&&!ids.length)||ids.some(id=>!uuid(id)))throw new AuthFailure('Selecciona personas válidas.',400);
 const name=typeof input.name==='string'?input.name.trim():'';
 const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
 if(action==='save'&&(!name||name.length>150||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new AuthFailure('Escribe un nombre y correo válidos.',400);
 if(isNew&&role===null)throw new AuthFailure('Selecciona el rol de la nueva cuenta.',400);
 let passwordHash:string|undefined;
 if(isNew||action==='password'){
  if(typeof input.password!=='string'||!validPassword(input.password))throw new AuthFailure('Utiliza una contraseña de 12 a 128 caracteres.',400);
  passwordHash=await hashPassword(input.password);
 }
 const db=await pool.connect();
 try{
  await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(982341)');
  // Recheck privileges inside the mutation lock, including requests queued before demotion.
  const privilege=await db.query(`SELECT 1 FROM ogp.usuarios u JOIN ogp.usuario_roles ur ON ur.usuario_id=u.id JOIN ogp.roles r ON r.id=ur.rol_id WHERE u.id=$1 AND u.estado='activo' AND r.codigo='administrador' AND r.activo`,[actor.id]);
  if(!privilege.rowCount)throw new AuthFailure('Acceso no permitido.',403);
  await db.query("SELECT set_config('ogp.actor_id',$1,true)",[actor.id]);
  let targetIds:string[]=ids;
  if(isNew){
   const {rows:[user]}=await db.query("INSERT INTO ogp.usuarios(nombre,correo,estado) VALUES($1,$2,'activo') RETURNING id",[name,email]);targetIds=[user.id];
   await db.query("UPDATE ogp.usuarios SET proveedor_auth='local',identificador_auth=$1::text WHERE id=$1::uuid",[user.id]);
   await db.query('INSERT INTO app_auth.credentials(usuario_id,password_hash) VALUES($1,$2)',[user.id,passwordHash]);
   await db.query('INSERT INTO ogp.usuario_modulos(usuario_id,modulo) SELECT $1,codigo FROM ogp.tipos_registro ON CONFLICT DO NOTHING',[user.id]);
  }else{
   const found=await db.query("SELECT u.id,u.correo FROM ogp.usuarios u JOIN app_auth.credentials c ON c.usuario_id=u.id WHERE u.id=ANY($1::uuid[]) AND u.estado='activo' FOR UPDATE OF u",[targetIds]);
   if(found.rowCount!==new Set(targetIds).size)throw new AuthFailure('No encontramos a la persona. Recarga el equipo.',404);
   if((action==='delete'||(action!=='password'&&role!=='administrador'))&&targetIds.includes(actor.id))throw new AuthFailure('No puedes retirar tu propio rol de administrador.',409);
   if(action==='delete'||(action!=='password'&&role!=='administrador')){
    const remaining=await db.query(`SELECT 1 FROM ogp.usuarios u JOIN app_auth.credentials c ON c.usuario_id=u.id JOIN ogp.usuario_roles ur ON ur.usuario_id=u.id JOIN ogp.roles r ON r.id=ur.rol_id WHERE u.estado='activo' AND r.codigo='administrador' AND r.activo AND NOT(u.id=ANY($1::uuid[])) LIMIT 1`,[targetIds]);
    if(!remaining.rowCount)throw new AuthFailure('Debe conservarse al menos un administrador.',409);
   }
   if(action==='delete')await db.query("UPDATE ogp.usuarios SET estado='desactivado' WHERE id=$1",[targetIds[0]]);
   if(action==='save')await db.query('UPDATE ogp.usuarios SET nombre=$2,correo=$3 WHERE id=$1',[targetIds[0],name,email]);
   if(action==='password'){
    await db.query('UPDATE app_auth.credentials SET password_hash=$2,actualizado_en=now() WHERE usuario_id=$1',[targetIds[0],passwordHash]);
    await db.query('DELETE FROM app_auth.login_attempts WHERE email_hash=$1',[tokenHash(found.rows[0].correo)]);
   }
  }
  if(action!=='password'&&action!=='delete'){
   await db.query('DELETE FROM ogp.usuario_roles WHERE usuario_id=ANY($1::uuid[]) AND rol_id IN (SELECT id FROM ogp.roles WHERE codigo=ANY($2))',[targetIds,roles]);
   if(role!==null)await db.query('INSERT INTO ogp.usuario_roles(usuario_id,rol_id) SELECT unnest($1::uuid[]),id FROM ogp.roles WHERE codigo=$2 AND activo',[targetIds,role]);
  }
  // Revoke existing sessions when credentials, identity or permissions change.
  if(!isNew)await db.query('DELETE FROM app_auth.sessions WHERE usuario_id=ANY($1::uuid[])',[targetIds]);
  await db.query('COMMIT');
  return {reauthenticate:!isNew&&targetIds.includes(actor.id)};
 }catch(error){await db.query('ROLLBACK');if(error&&typeof error==='object'&&'code' in error)console.error('Account management error code',error.code,'constraint' in error?error.constraint:'');if(error&&typeof error==='object'&&'code' in error&&error.code==='23505')throw new AuthFailure('Este correo ya está registrado.',409);throw error;}finally{db.release();}
}
