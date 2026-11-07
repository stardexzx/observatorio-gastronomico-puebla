import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {CatalogFailure,isPublicKind,publicationState,publishCatalog} from '@/db/catalogs';
import {catalogUser,catalogError} from '@/lib/catalog-api';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{kind:string;id:string}>};
export async function GET(request:NextRequest,{params}:Context){try{
 await catalogUser(request);const {kind,id}=await params;if(!isPublicKind(kind))throw new CatalogFailure('Catálogo no encontrado.',404);
 return NextResponse.json(await publicationState(kind,id),{headers:{'Cache-Control':'no-store'}});
}catch(error){return catalogError(error);}}
export async function POST(request:NextRequest,{params}:Context){try{
 const user=await catalogUser(request,true);const {kind,id}=await params;if(!isPublicKind(kind))throw new CatalogFailure('Catálogo no encontrado.',404);
 const {action}=z.object({action:z.enum(['publish','unpublish'])}).parse(await request.json());
 return NextResponse.json(await publishCatalog(kind,id,action,user));
}catch(error){return catalogError(error);}}
