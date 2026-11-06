import { recipeDataMode } from "@/data/recipe-data-mode";
import { NextRequest, NextResponse } from "next/server";
import { localOnly, failure } from "@/lib/api-demo";
import { getSessionUser } from "@/lib/auth/session";
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(request:NextRequest,{params}:Context){
 try{if(!await getSessionUser())return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});if(recipeDataMode==='local')return NextResponse.json({error:'El servicio de recetas no está disponible.'},{status:503});const denied=localOnly(request);if(denied)return denied;const {getRecipe}=await import('@/db/recipes');const recipe=await getRecipe((await params).id);return recipe?NextResponse.json({recipe}):NextResponse.json({error:'Receta no encontrada'},{status:404});}catch(error){return failure(error);}
}
export async function PUT(request:NextRequest,{params}:Context){
 try{const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});if(user.role==='revisor')return NextResponse.json({error:'No tienes permiso para editar recetas.'},{status:403});if(recipeDataMode==='local')return NextResponse.json({error:'El servicio de recetas no está disponible.'},{status:503});const denied=localOnly(request,true);if(denied)return denied;const {saveRecipe}=await import('@/db/recipes');return NextResponse.json({recipe:await saveRecipe(await request.json(),(await params).id,user.id)});}catch(error){return failure(error);}
}
export async function DELETE(request:NextRequest,{params}:Context){
 try{const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});if(user.role==='revisor')return NextResponse.json({error:'No tienes permiso para eliminar recetas.'},{status:403});if(recipeDataMode==='local')return NextResponse.json({error:'El servicio de recetas no está disponible.'},{status:503});const denied=localOnly(request,true);if(denied)return denied;const {archiveRecipe}=await import('@/db/recipes');return await archiveRecipe((await params).id,user.id)?NextResponse.json({deleted:true}):NextResponse.json({error:'Receta no encontrada'},{status:404});}catch(error){return failure(error);}
}
