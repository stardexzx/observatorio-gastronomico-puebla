import { NextRequest, NextResponse } from "next/server";
import { loginAccount } from "@/lib/auth/accounts";
import { sameOrigin, authError } from "@/lib/auth/request";
import { sessionCookie, sessionCookieOptions, sessionDuration } from "@/lib/auth/session";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Solicitud no permitida.'},{status:403});
 try{
  const body=await request.json() as Record<string,unknown>;
  if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Solicitud no válida."},{status:400});
  const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
  const password=typeof body.password==='string'?body.password:'';
  if(!email||email.length>254||!password||password.length>128)return NextResponse.json({error:'Correo o contraseña incorrectos.'},{status:401});
  const {token}=await loginAccount(email,password);
  const response=NextResponse.json({redirect:'/'},{headers:{'Cache-Control':'no-store'}});
  response.cookies.set(sessionCookie,token,{...sessionCookieOptions,maxAge:sessionDuration});
  return response;
 }catch(error){return authError(error);}
}
