import {NextResponse} from 'next/server';
import {loadPublicCatalog} from '@/db/public-catalog';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){try{
 return NextResponse.json(await loadPublicCatalog(),{headers:{'Cache-Control':'no-store'}});
}catch(error){
 console.error('Public catalog unavailable',error instanceof Error?error.name:'unknown');
 return NextResponse.json({error:'No se pudo cargar la información del observatorio. Intenta de nuevo más tarde.'},{status:503,headers:{'Cache-Control':'no-store'}});
}}
