import {uploadLegalDocument} from '@/db/legal';
import {LEGAL_MAX_PDF_BYTES} from '@/data/legal';
import {legalIdentifierSchema,legalUploadMetadataSchema} from '@/lib/legal-validation';
import {LegalApiFailure,legalUser,legalJson,legalError,requireLegalMultipartOrigin,readLegalMultipart} from '@/lib/legal-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,{params}:Context){
 try{
  const user=await legalUser();requireLegalMultipartOrigin(request);
  const id=legalIdentifierSchema.parse((await params).id),form=await readLegalMultipart(request);
  const allowed=new Set(['file','visibility','license','sourceId']);
  for(const key of form.keys())if(!allowed.has(key)||form.getAll(key).length!==1)throw new LegalApiFailure('El formulario contiene campos no válidos.',400);
  const file=form.get('file');
  if(!(file instanceof File))throw new LegalApiFailure('Selecciona un archivo PDF.',400);
  if(file.size===0||file.size>LEGAL_MAX_PDF_BYTES)throw new LegalApiFailure('El PDF debe pesar entre 1 byte y 20 MB.',file.size>LEGAL_MAX_PDF_BYTES?413:400);
  if(file.type.toLowerCase()!=='application/pdf')throw new LegalApiFailure('Solo se admiten archivos PDF.',415);
  const metadata=legalUploadMetadataSchema.parse({
   visibility:form.get('visibility'),license:form.get('license')??'',
   ...(form.get('sourceId')?{sourceId:form.get('sourceId')}:{})
  });
  const bytes=Buffer.from(await file.arrayBuffer());
  if(bytes.subarray(0,5).toString('ascii')!=='%PDF-')throw new LegalApiFailure('El archivo no tiene una firma PDF válida.',415);
  const name=Array.from(file.name.replace(/[\\/]/g,'_')).filter(char=>char.charCodeAt(0)>=32&&char.charCodeAt(0)!==127).join('').trim().slice(0,200);
  if(!name)throw new LegalApiFailure('El archivo necesita un nombre.',400);
  return legalJson({record:await uploadLegalDocument(user,id,{bytes,name,type:'application/pdf',...metadata})},201);
 }catch(error){return legalError(error);}
}
