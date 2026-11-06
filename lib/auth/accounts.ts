import "server-only";
import { pool } from "@/db/postgres";
import { hashPassword, newToken, tokenHash, verifyPassword } from "./passwords";
import { sessionDuration } from "./session";
import type { SessionUser } from "./types";
export class AuthFailure extends Error {constructor(message:string,public status=401){super(message);}}
export async function loginAccount(email:string,password:string){
 const db=await pool.connect();
 try{
  await db.query('BEGIN');
  const key=tokenHash(email);
  await db.query('INSERT INTO app_auth.login_attempts(email_hash) VALUES ($1) ON CONFLICT DO NOTHING',[key]);
  const {rows:[attempt]}=await db.query('SELECT failures,window_start FROM app_auth.login_attempts WHERE email_hash=$1 FOR UPDATE',[key]);
  const expired=Date.now()-new Date(attempt.window_start).getTime()>15*60*1000;
  if(!expired&&attempt.failures>=5){await db.query('ROLLBACK');throw new AuthFailure('Demasiados intentos. Vuelve a intentarlo en 15 minutos.',429);}
  const {rows:[account]}=await db.query(`SELECT u.id,u.nombre AS name,u.correo AS email,c.password_hash,
   (SELECT r.codigo FROM ogp.usuario_roles ur JOIN ogp.roles r ON r.id=ur.rol_id AND r.activo WHERE ur.usuario_id=u.id AND r.codigo IN ('administrador','capturista','revisor') ORDER BY CASE r.codigo WHEN 'administrador' THEN 0 WHEN 'revisor' THEN 1 ELSE 2 END LIMIT 1) AS role
   FROM ogp.usuarios u JOIN app_auth.credentials c ON c.usuario_id=u.id WHERE u.correo=$1 AND u.estado='activo'`,[email]);
  const valid=await verifyPassword(password,account?.password_hash??"");
  if(!valid||!account?.role){
   await db.query('UPDATE app_auth.login_attempts SET failures=$2,window_start=CASE WHEN $3 THEN now() ELSE window_start END WHERE email_hash=$1',[key,expired?1:attempt.failures+1,expired]);
   await db.query('COMMIT');throw new AuthFailure('Correo o contraseña incorrectos.');
  }
  await db.query('DELETE FROM app_auth.login_attempts WHERE email_hash=$1',[key]);
  const token=newToken();
  await db.query("DELETE FROM app_auth.sessions WHERE vence_en<=now()");
  await db.query("INSERT INTO app_auth.sessions(token_hash,usuario_id,vence_en) VALUES ($1,$2,now()+$3*interval '1 second')",[tokenHash(token),account.id,sessionDuration]);
  await db.query('COMMIT');
  return {token,user:{id:account.id,name:account.name,email:account.email,role:account.role} as SessionUser};
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
export async function activationInfo(token:string){
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 const {rows:[row]}=await pool.query(`SELECT correo AS email,nombre AS name FROM app_auth.activations WHERE token_hash=$1 AND role_code='administrador' AND NOT EXISTS(SELECT 1 FROM app_auth.credentials) AND usado_en IS NULL AND vence_en>now()`,[tokenHash(token)]);
 return row as {email:string;name:string}|undefined;
}
export async function activateAccount(token:string,password:string){
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new AuthFailure('El enlace no es válido o ya venció.',400);
 const passwordHash=await hashPassword(password);
 const db=await pool.connect();
 try{
  await db.query('BEGIN');
  await db.query('SELECT pg_advisory_xact_lock(982341)');
  const {rows:[activation]}=await db.query(`SELECT * FROM app_auth.activations WHERE token_hash=$1 AND role_code='administrador' AND NOT EXISTS(SELECT 1 FROM app_auth.credentials) AND usado_en IS NULL AND vence_en>now() FOR UPDATE`,[tokenHash(token)]);
  if(!activation)throw new AuthFailure('El enlace no es válido o ya venció.',400);
  const {rows:[user]}=await db.query("INSERT INTO ogp.usuarios(correo,nombre,estado) VALUES ($1,$2,'invitado') ON CONFLICT(correo) DO UPDATE SET correo=EXCLUDED.correo RETURNING id,estado",[activation.correo,activation.nombre]);
  if(user.estado==='desactivado')throw new AuthFailure('No se pudo activar esta cuenta.',403);
  if((await db.query('SELECT 1 FROM app_auth.credentials WHERE usuario_id=$1',[user.id])).rowCount)throw new AuthFailure('Esta cuenta ya está activada. Inicia sesión.',409);
  await db.query("SELECT set_config('ogp.actor_id',$1,true)",[user.id]);
  await db.query('INSERT INTO app_auth.credentials(usuario_id,password_hash) VALUES ($1,$2)',[user.id,passwordHash]);
  await db.query("UPDATE ogp.usuarios SET estado='activo',proveedor_auth='local',identificador_auth=$2 WHERE id=$1",[user.id,user.id]);
  await db.query('INSERT INTO ogp.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM ogp.roles WHERE codigo=$2 ON CONFLICT DO NOTHING',[user.id,activation.role_code]);
  await db.query('INSERT INTO ogp.usuario_modulos(usuario_id,modulo) SELECT $1,codigo FROM ogp.tipos_registro ON CONFLICT DO NOTHING',[user.id]);
  await db.query('UPDATE app_auth.activations SET usado_en=now() WHERE token_hash=$1',[tokenHash(token)]);
  await db.query('COMMIT');
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
