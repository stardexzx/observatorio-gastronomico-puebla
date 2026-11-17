import {loadLegalDocument} from '@/db/legal';
import {getSessionUser} from '@/lib/auth/session';
import {legalIdentifierSchema} from '@/lib/legal-validation';
import {LegalApiFailure,legalError} from '@/lib/legal-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{fileId:string}>};
export async function GET(_request:Request,{params}:Context){
 try{
  const fileId=legalIdentifierSchema.parse((await params).fileId);
  const file=await loadLegalDocument(await getSessionUser(),fileId);
  if(!file)throw new LegalApiFailure('Documento no encontrado.',404);
  const name=Array.from(file.name).filter(char=>char.charCodeAt(0)>=32&&char.charCodeAt(0)!==127).join('').replace(/["\\]/g,'_');
  const ascii=name.replace(/[^\x20-\x7e]/g,'_')||'documento.pdf';
  const encoded=encodeURIComponent(name).replace(/['()*]/g,char=>'%'+char.charCodeAt(0).toString(16).toUpperCase());
  return new Response(new Uint8Array(file.bytes),{headers:{
   'Content-Type':'application/pdf','Content-Length':String(file.bytes.byteLength),
   'Content-Disposition':'inline; filename="'+ascii+'"; filename*=UTF-8\'\''+encoded,
   'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"
  }});
 }catch(error){return legalError(error);}
}
