import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { isSameOriginJson } from "./request-origin";
export function localOnly(request:NextRequest,write=false){
 const host=request.headers.get('host');
 if(!host)return NextResponse.json({error:'Host requerido'},{status:403});
 const hostname=new URL(`http://${host}`).hostname;
 if(!['127.0.0.1','localhost','[::1]'].includes(hostname))return NextResponse.json({error:'Demo disponible solo en este equipo.'},{status:403});
 if(write){if(!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'Se requiere JSON'},{status:415});if(!isSameOriginJson(request))return NextResponse.json({error:'Origen no permitido'},{status:403});}
 return null;
}
export function failure(error:unknown){console.error('API demo:',error);return NextResponse.json({error:error instanceof ZodError?'Revisa los campos y los archivos antes de guardar.':'No se pudo completar la operación. Vuelve a intentarlo.'},{status:error instanceof ZodError?400:500})}
