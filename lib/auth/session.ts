import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { pool } from "@/db/postgres";
import { tokenHash } from "./passwords";
import type { SessionUser } from "./types";
export const sessionCookie="ogp_session";
export const sessionDuration=8*60*60;
export const sessionCookieOptions={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/"};
export const getSessionUser=cache(async():Promise<SessionUser|null>=>{
 const token=(await cookies()).get(sessionCookie)?.value;
 if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 const {rows:[user]}=await pool.query(`SELECT u.id,u.nombre AS name,u.correo AS email,
 (SELECT r.codigo FROM ogp.usuario_roles ur JOIN ogp.roles r ON r.id=ur.rol_id AND r.activo
 WHERE ur.usuario_id=u.id AND r.codigo IN ('administrador','capturista','revisor')
 ORDER BY CASE r.codigo WHEN 'administrador' THEN 0 WHEN 'revisor' THEN 1 ELSE 2 END LIMIT 1) AS role
 FROM app_auth.sessions s JOIN ogp.usuarios u ON u.id=s.usuario_id
 WHERE s.token_hash=$1 AND s.vence_en>now() AND u.estado='activo'`,[tokenHash(token)]);
 return user?.role?user as SessionUser:null;
});
export async function requireSessionUser(){const user=await getSessionUser();if(!user)redirect("/iniciar-sesion");return user;}
