import {readLegalOptions} from '@/db/legal';
import {legalUser,legalJson,legalError} from '@/lib/legal-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{return legalJson(await readLegalOptions(await legalUser()));}
 catch(error){return legalError(error);}
}
