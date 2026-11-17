import {readLegalCatalog,createLegalRecord} from '@/db/legal';
import {legalInputSchema} from '@/lib/legal-validation';
import {legalUser,legalJson,legalError,requireLegalJsonOrigin,readLegalJson} from '@/lib/legal-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{return legalJson(await readLegalCatalog(await legalUser()));}
 catch(error){return legalError(error);}
}
export async function POST(request:Request){
 try{
  const user=await legalUser();requireLegalJsonOrigin(request);
  const input=legalInputSchema.parse(await readLegalJson(request));
  return legalJson({record:await createLegalRecord(user,input)},201);
 }catch(error){return legalError(error);}
}
