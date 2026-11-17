import {loadPublicCatalog} from '@/db/public-catalog';
import {legalIdentifierSchema} from '@/lib/legal-validation';
import {LegalApiFailure,legalJson,legalError} from '@/lib/legal-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){
 try{
  const id=legalIdentifierSchema.parse((await params).id),catalog=await loadPublicCatalog();
  const record=catalog.legal.find(item=>item.id===id);
  if(!record)throw new LegalApiFailure('Instrumento no encontrado.',404);
  return legalJson({record});
 }catch(error){return legalError(error);}
}
