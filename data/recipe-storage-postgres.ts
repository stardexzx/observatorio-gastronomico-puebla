import { normalizeRecipe, type RecipeRecord } from "@/data/recipes";
let cache:RecipeRecord[]=[];
export function readRecipes(){return cache}
async function api(path:string,options?:RequestInit){
 const response=await fetch(path,{cache:'no-store',...options});
 const body=await response.json() as {error?:string;recipes:RecipeRecord[];recipe:RecipeRecord};if(!response.ok)throw new Error(body.error||'No se pudo completar la operación. Vuelve a intentarlo.');return body;
}
export async function loadRecipes():Promise<RecipeRecord[]>{const body=await api('/api/recipes');cache=body.recipes.map(normalizeRecipe);return cache}
export async function findRecipe(id:string):Promise<RecipeRecord|null>{
 const response=await fetch(`/api/recipes/${encodeURIComponent(id)}`,{cache:'no-store'});if(response.status===404)return null;
 const body=await response.json() as {error?:string;recipes:RecipeRecord[];recipe:RecipeRecord};if(!response.ok)throw new Error(body.error||'No se pudo cargar la receta');return normalizeRecipe(body.recipe);
}
export async function createRecipe(recipe:RecipeRecord):Promise<RecipeRecord>{
 const body=await api('/api/recipes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(recipe)});
 const saved=normalizeRecipe(body.recipe);cache=[saved,...cache];return saved;
}
export async function upsertRecipe(recipe:RecipeRecord):Promise<RecipeRecord>{
 const body=await api(`/api/recipes/${encodeURIComponent(recipe.id)}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(recipe)});
 const saved=normalizeRecipe(body.recipe);cache=cache.map(item=>item.id===saved.id?saved:item);return saved;
}

export async function deleteRecipe(id:string):Promise<void>{
 await api(`/api/recipes/${encodeURIComponent(id)}`,{method:'DELETE',headers:{'Content-Type':'application/json'}});
 cache=cache.filter(item=>item.id!==id);
}
