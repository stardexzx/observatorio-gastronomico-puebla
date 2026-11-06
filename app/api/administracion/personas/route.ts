import { NextRequest,NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { listAccounts,manageAccount } from "@/lib/auth/admin-accounts";
import { sameOrigin,authError } from "@/lib/auth/request";
export const runtime='nodejs';
export async function GET(){
 try{const user=await getSessionUser();if(user?.role!=='administrador')return NextResponse.json({error:'Acceso no permitido.'},{status:user?403:401});return NextResponse.json({members:await listAccounts()},{headers:{'Cache-Control':'no-store'}});}catch(error){return authError(error);}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return NextResponse.json({error:'Solicitud no permitida.'},{status:403});
 try{
  const user=await getSessionUser();if(user?.role!=='administrador')return NextResponse.json({error:'Acceso no permitido.'},{status:user?403:401});
  const input:unknown=await request.json();if(!input||typeof input!=='object'||Array.isArray(input))return NextResponse.json({error:'Solicitud no válida.'},{status:400});
  const result=await manageAccount(user,input as Record<string,unknown>);return NextResponse.json(result.reauthenticate?result:{...result,members:await listAccounts()},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return authError(error);}
}
