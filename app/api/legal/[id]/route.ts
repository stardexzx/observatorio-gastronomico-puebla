import {getLegalRecord,updateLegalRecord,archiveLegalRecord} from '@/db/legal';
import {legalIdentifierSchema,legalInputSchema} from '@/lib/legal-validation';
import {LegalApiFailure,legalUser,legalJson,legalError,requireLegalJsonOrigin,readLegalJson} from '@/lib/legal-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){
 try{
  const user=await legalUser(),id=legalIdentifierSchema.parse((await params).id);
  const record=await getLegalRecord(user,id);
  if(!record)throw new LegalApiFailure('Instrumento no encontrado.',404);
  return legalJson({record});
 }catch(error){return legalError(error);}
}
export async function PUT(request:Request,{params}:Context){
 try{
  const user=await legalUser();requireLegalJsonOrigin(request);
  const id=legalIdentifierSchema.parse((await params).id),input=legalInputSchema.parse(await readLegalJson(request));
  return legalJson({record:await updateLegalRecord(user,id,input)});
 }catch(error){return legalError(error);}
}
export async function DELETE(request:Request,{params}:Context){
 try{
  const user=await legalUser();requireLegalJsonOrigin(request);
  const id=legalIdentifierSchema.parse((await params).id);
  return legalJson({record:await archiveLegalRecord(user,id)});
 }catch(error){return legalError(error);}
}
