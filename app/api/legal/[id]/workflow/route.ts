import {applyLegalWorkflow} from '@/db/legal';
import {legalIdentifierSchema,legalWorkflowSchema} from '@/lib/legal-validation';
import {legalUser,legalJson,legalError,requireLegalJsonOrigin,readLegalJson} from '@/lib/legal-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,{params}:Context){
 try{
  const user=await legalUser();requireLegalJsonOrigin(request);
  const id=legalIdentifierSchema.parse((await params).id),input=legalWorkflowSchema.parse(await readLegalJson(request));
  return legalJson({record:await applyLegalWorkflow(user,id,input)});
 }catch(error){return legalError(error);}
}
