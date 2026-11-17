import 'server-only';
import {NextResponse} from 'next/server';
import {ZodError} from 'zod';
import {getSessionUser} from '@/lib/auth/session';
import {isSameOriginJson} from '@/lib/request-origin';
import {LEGAL_MAX_PDF_BYTES} from '@/data/legal';

export class LegalApiFailure extends Error {
 constructor(message:string,public status=400){super(message);this.name='LegalApiFailure';}
}
export function legalJson(value:unknown,status=200){
 return NextResponse.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export function legalError(error:unknown){
 if(error instanceof ZodError)return legalJson({error:'Revisa los datos del instrumento.',issues:error.issues.map(issue=>({path:issue.path.join('.'),message:issue.message}))},400);
 if(error instanceof SyntaxError)return legalJson({error:'La solicitud no contiene JSON válido.'},400);
 if(error instanceof LegalApiFailure)return legalJson({error:error.message},error.status);
 if(error instanceof Error&&error.name==='LegalFailure'&&'status' in error&&typeof error.status==='number'&&error.status>=400&&error.status<=599)return legalJson({error:error.message},error.status);
 const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';
 if(code==='42501')return legalJson({error:'No tienes permiso para realizar esta operación.'},403);
 if(code==='22P02'||code==='22007'||code==='22008'||code==='23514'||code==='23502')return legalJson({error:'Los datos del instrumento no son válidos.'},400);
 if(code==='23503'||code==='23505'||code==='40001'||code==='40P01')return legalJson({error:'La información cambió o contiene referencias no disponibles. Actualiza y vuelve a intentarlo.'},409);
 if(code==='P0001')return legalJson({error:'El estado, los permisos o la documentación no permiten esta operación.'},409);
 const metadata=typeof error==='object'&&error!==null?error as Record<string,unknown>:{};
 const identifier=(value:unknown)=>typeof value==='string'&&/^[a-zA-Z0-9_]{1,120}$/.test(value)?value:undefined;
 // Structural diagnostic only: no messages, SQL text, parameters or personal data.
 console.error('OGP_LEGAL_ERROR '+JSON.stringify({type:identifier(error instanceof Error?error.name:'unknown'),code:identifier(code),table:identifier(metadata.table),column:identifier(metadata.column),constraint:identifier(metadata.constraint),position:typeof metadata.position==='string'&&/^\d+$/.test(metadata.position)?metadata.position:undefined}));
 return legalJson({error:'No se pudo completar la solicitud. Intenta de nuevo más tarde.'},503);
}
export async function legalUser(){
 const user=await getSessionUser();
 if(!user)throw new LegalApiFailure('Inicia sesión para continuar.',401);
 return user;
}
export function requireLegalJsonOrigin(request:Request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??'')||!isSameOriginJson(request))throw new LegalApiFailure('La solicitud debe usar JSON y proceder de este sitio.',403);
}
export function requireLegalMultipartOrigin(request:Request){
 const origin=request.headers.get('origin'),host=request.headers.get('host');
 if(!origin||!host||/[\s/\\@?#]/.test(host))throw new LegalApiFailure('La solicitud debe proceder de este sitio.',403);
 try{
  const protocol=new URL(request.url).protocol;
  if(!['http:','https:'].includes(protocol)||origin!==new URL(protocol+'//'+host).origin)throw new Error('origin');
 }catch{throw new LegalApiFailure('La solicitud debe proceder de este sitio.',403);}
 if(!/^multipart\/form-data\s*;/i.test(request.headers.get('content-type')??''))throw new LegalApiFailure('Envía el documento mediante un formulario multipart.',415);
}
async function limitedBody(request:Request,maximum:number){
 const declared=request.headers.get('content-length');
 if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>maximum))throw new LegalApiFailure('La solicitud supera el tamaño permitido.',413);
 const reader=request.body?.getReader();
 if(!reader)return new Uint8Array();
 const chunks:Uint8Array[]=[];let length=0;
 try{
  for(;;){
   const {value,done}=await reader.read();if(done)break;
   length+=value.byteLength;
   if(length>maximum){await reader.cancel();throw new LegalApiFailure('La solicitud supera el tamaño permitido.',413);}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const body=new Uint8Array(length);let offset=0;
 for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
 return body;
}
export async function readLegalJson(request:Request):Promise<unknown>{
 const body=await limitedBody(request,1024*1024);
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body));}
 catch{throw new LegalApiFailure('La solicitud no contiene JSON válido.',400);}
}
export async function readLegalMultipart(request:Request){
 const body=await limitedBody(request,LEGAL_MAX_PDF_BYTES+128*1024);
 try{
  return await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')??''},body:new Blob([body.buffer])}).formData();
 }catch{throw new LegalApiFailure('El formulario del documento no es válido.',400);}
}
