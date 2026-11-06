import { NextRequest, NextResponse } from "next/server";
import { activateAccount } from "@/lib/auth/accounts";
import { validPassword } from "@/lib/auth/passwords";
import { sameOrigin, authError } from "@/lib/auth/request";
export const runtime="nodejs";
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Solicitud no permitida.'},{status:403});
 try{
  const body=await request.json() as Record<string,unknown>;
  if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"Solicitud no válida."},{status:400});
  if(typeof body.token!=='string'||typeof body.password!=='string'||!validPassword(body.password))return NextResponse.json({error:'La contraseña debe tener entre 12 y 128 caracteres.'},{status:400});
  await activateAccount(body.token,body.password);
  return NextResponse.json({redirect:'/iniciar-sesion'},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return authError(error);}
}
