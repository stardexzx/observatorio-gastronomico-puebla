import {NextRequest,NextResponse} from 'next/server';
import {ZodError} from 'zod';
import {getSessionUser} from '@/lib/auth/session';
import {isSameOriginJson} from '@/lib/request-origin';
import {CatalogFailure} from '@/db/catalogs';
export async function catalogUser(request:NextRequest,write=false){
 const user=await getSessionUser();
 if(!user)throw new CatalogFailure('Inicia sesión para continuar.',401);
 if(write&&!isSameOriginJson(request))throw new CatalogFailure('Origen no permitido.',403);
 return user;
}
export function catalogError(error:unknown){
 if(error instanceof CatalogFailure)return NextResponse.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});
 if(error instanceof ZodError)return NextResponse.json({error:'Revisa los campos y archivos de la ficha antes de guardar.'},{status:400});
 console.error('Catalog service error',error instanceof Error?error.name:'unknown');
 return NextResponse.json({error:'No se pudo consultar o guardar el catálogo. Comprueba la conexión con PostgreSQL.'},{status:503,headers:{'Cache-Control':'no-store'}});
}
