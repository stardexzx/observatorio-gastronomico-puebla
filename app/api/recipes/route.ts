import { recipeDataMode } from "@/data/recipe-data-mode";
import { NextRequest, NextResponse } from "next/server";
import { localOnly, failure } from "@/lib/api-demo";
import { getSessionUser } from "@/lib/auth/session";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 try{if(!await getSessionUser())return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});if(recipeDataMode==='local')return NextResponse.json({error:'El servicio de recetas no está disponible.'},{status:503});const denied=localOnly(request);if(denied)return denied;const {listRecipes}=await import('@/db/recipes');return NextResponse.json({recipes:await listRecipes()});}catch(error){return failure(error);}
}
export async function POST(request:NextRequest){
 try{const user=await getSessionUser();if(!user)return NextResponse.json({error:'Inicia sesión para continuar.'},{status:401});if(user.role==='revisor')return NextResponse.json({error:'No tienes permiso para crear recetas.'},{status:403});if(recipeDataMode==='local')return NextResponse.json({error:'El servicio de recetas no está disponible.'},{status:503});const denied=localOnly(request,true);if(denied)return denied;const {saveRecipe}=await import('@/db/recipes');return NextResponse.json({recipe:await saveRecipe(await request.json(),undefined,user.id)},{status:201});}catch(error){return failure(error);}
}
