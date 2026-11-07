import {NextRequest,NextResponse} from 'next/server';
import {CatalogFailure,isCatalogKind,getCatalogRecord,saveCatalog,deleteCatalog} from '@/db/catalogs';
import {catalogUser,catalogError} from '@/lib/catalog-api';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{kind:string;id:string}>};
export async function GET(request:NextRequest,{params}:Context){try{
 await catalogUser(request);const {kind,id}=await params;
 if(!isCatalogKind(kind))throw new CatalogFailure('Catálogo no encontrado.',404);
 const record=await getCatalogRecord(kind,id);if(!record)throw new CatalogFailure('Ficha no encontrada.',404);
 return NextResponse.json({record},{headers:{'Cache-Control':'no-store'}});
}catch(error){return catalogError(error);}}
export async function PUT(request:NextRequest,{params}:Context){try{
 const user=await catalogUser(request,true);const {kind,id}=await params;
 if(!isCatalogKind(kind))throw new CatalogFailure('Catálogo no encontrado.',404);
 return NextResponse.json({record:await saveCatalog(kind,await request.json(),id,user)});
}catch(error){return catalogError(error);}}
export async function DELETE(request:NextRequest,{params}:Context){try{
 const user=await catalogUser(request,true);const {kind,id}=await params;
 if(!isCatalogKind(kind))throw new CatalogFailure('Catálogo no encontrado.',404);
 if(!await deleteCatalog(kind,id,user))throw new CatalogFailure('Ficha no encontrada.',404);
 return NextResponse.json({deleted:true});
}catch(error){return catalogError(error);}}
