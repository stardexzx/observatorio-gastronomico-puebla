import {loadPublicCatalog} from '@/db/public-catalog';
import {legalJson,legalError} from '@/lib/legal-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const catalog=await loadPublicCatalog();
  return legalJson({records:catalog.legal,summary:catalog.legalSummary});
 }catch(error){return legalError(error);}
}
