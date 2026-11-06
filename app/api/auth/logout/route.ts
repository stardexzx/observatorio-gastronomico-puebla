import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/db/postgres";
import { sameOrigin, authError } from "@/lib/auth/request";
import { sessionCookie, sessionCookieOptions } from "@/lib/auth/session";
import { tokenHash } from "@/lib/auth/passwords";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Solicitud no permitida.'},{status:403});
 try{
  const token=request.cookies.get(sessionCookie)?.value;
  if(token)await pool.query('DELETE FROM app_auth.sessions WHERE token_hash=$1',[tokenHash(token)]);
  const response=NextResponse.json({redirect:'/iniciar-sesion'},{headers:{'Cache-Control':'no-store'}});
  response.cookies.set(sessionCookie,'',{...sessionCookieOptions,maxAge:0});return response;
 }catch(error){return authError(error);}
}
