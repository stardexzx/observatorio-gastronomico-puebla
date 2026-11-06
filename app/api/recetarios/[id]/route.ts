import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {NextRequest,NextResponse} from 'next/server';
import {getSessionUser} from '@/lib/auth/session';
import {recipeBooks} from '@/data/recipe-books';
import {parseByteRange} from '@/lib/book-navigation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function serve(request:NextRequest,context:{params:Promise<{id:string}>},head=false){
 try{
  if(!await getSessionUser())return NextResponse.json({error:'Inicia sesión para leer el recetario.'},{status:401});
  const {id}=await context.params;const book=recipeBooks.find(item=>item.id===id);
  if(!book)return NextResponse.json({error:'No encontramos ese recetario.'},{status:404});
  const path=join(process.cwd(),'assets','recetarios',book.filename);const {size}=await stat(path);
  const headers:Record<string,string>={'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${book.filename}"`,'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
  const range=request.headers.get('range');const part=range?parseByteRange(range,size):{start:0,end:size-1};
  if(!part)return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${size}`}});
  headers['Content-Length']=String(part.end-part.start+1);
  if(range)headers['Content-Range']=`bytes ${part.start}-${part.end}/${size}`;
  if(head)return new Response(null,{status:range?206:200,headers});
  const stream=createReadStream(path,part);
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>,{status:range?206:200,headers});
 }catch(error){if(error && typeof error==='object' && 'code' in error && error.code==='ENOENT')return NextResponse.json({error:'El archivo de este recetario aún no está disponible.'},{status:404});return NextResponse.json({error:'No se pudo abrir el recetario. Vuelve a intentarlo.'},{status:503});}
}
export const GET=(request:NextRequest,context:{params:Promise<{id:string}>})=>serve(request,context);
export const HEAD=(request:NextRequest,context:{params:Promise<{id:string}>})=>serve(request,context,true);
