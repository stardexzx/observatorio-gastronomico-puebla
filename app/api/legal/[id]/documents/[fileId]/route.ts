import {detachLegalDocument} from '@/db/legal';
import {legalIdentifierSchema} from '@/lib/legal-validation';
import {legalUser,legalJson,legalError,requireLegalJsonOrigin} from '@/lib/legal-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string;fileId:string}>};
export async function DELETE(request:Request,{params}:Context){
 try{
  const user=await legalUser();requireLegalJsonOrigin(request);
  const values=await params,id=legalIdentifierSchema.parse(values.id),fileId=legalIdentifierSchema.parse(values.fileId);
  return legalJson({record:await detachLegalDocument(user,id,fileId)});
 }catch(error){return legalError(error);}
}
