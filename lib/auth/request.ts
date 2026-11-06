import { NextRequest, NextResponse } from "next/server";
import { AuthFailure } from "./accounts";
import { isSameOriginJson } from "../request-origin";
export function sameOrigin(request:NextRequest){
 return isSameOriginJson(request);
}
export function authError(error:unknown){
 if(error instanceof AuthFailure)return NextResponse.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});
 console.error('Authentication service error',error instanceof Error?error.name:'unknown');
 return NextResponse.json({error:'No se pudo completar la solicitud. Vuelve a intentarlo.'},{status:503,headers:{'Cache-Control':'no-store'}});
}
