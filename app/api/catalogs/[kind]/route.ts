import {NextRequest,NextResponse} from 'next/server';
import {CatalogFailure,isCatalogKind,listCatalog,saveCatalog} from '@/db/catalogs';
import {listRecipes} from '@/db/recipes';
import {catalogUser,catalogError} from '@/lib/catalog-api';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{kind:string}>};
export async function GET(request:NextRequest,{params}:Context){try{
 await catalogUser(request);const {kind}=await params;
 if(kind==='recipes')return NextResponse.json({records:await listRecipes()},{headers:{'Cache-Control':'no-store'}});
 if(!isCatalogKind(kind))throw new CatalogFailure('Catálogo no encontrado.',404);
 return NextResponse.json({records:await listCatalog(kind)},{headers:{'Cache-Control':'no-store'}});
}catch(error){return catalogError(error);}}
export async function POST(request:NextRequest,{params}:Context){try{
 const user=await catalogUser(request,true);const {kind}=await params;
 if(!isCatalogKind(kind))throw new CatalogFailure('Catálogo no encontrado.',404);
 return NextResponse.json({record:await saveCatalog(kind,await request.json(),undefined,user)},{status:201});
}catch(error){return catalogError(error);}}
