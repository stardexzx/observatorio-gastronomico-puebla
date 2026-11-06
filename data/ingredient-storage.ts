import { initialIngredients, normalizeIngredient, type IngredientRecord } from "@/data/ingredients";

export const ingredientStorageKey="observatorio-ingredients-v1";
export function readIngredients():IngredientRecord[]{
  if(typeof window==="undefined")return initialIngredients.map(normalizeIngredient);
  let saved:string|null;
  try{saved=window.localStorage.getItem(ingredientStorageKey)}catch{throw new Error("No se puede acceder al almacenamiento de ingredientes en este navegador.")}
  if(!saved)return initialIngredients.map(normalizeIngredient);
  try{
    const records:unknown=JSON.parse(saved);
    if(!Array.isArray(records)||records.some(record=>!record||typeof record!=="object"||Array.isArray(record)))throw new Error();
    return records.map(record=>normalizeIngredient(record as Partial<IngredientRecord>));
  }catch{throw new Error("No se pudieron leer los ingredientes guardados. Los datos originales se conservaron; revisa tu respaldo antes de reemplazarlos.")}
}
export function writeIngredients(records:IngredientRecord[]){
  if(typeof window==="undefined")throw new Error("El guardado local solo está disponible en el navegador.");
  try{window.localStorage.setItem(ingredientStorageKey,JSON.stringify(records.map(normalizeIngredient)))}catch{throw new Error("No se pudo guardar el ingrediente en este navegador. Revisa el espacio disponible o elimina fotografías de gran tamaño. Tus cambios siguen en pantalla.")}
}
export function findIngredient(id:string){return readIngredients().find(item=>item.id===id)??null}
export function upsertIngredient(record:IngredientRecord){
  const records=readIngredients();
  const normalized=normalizeIngredient(record);
  const exists=records.some(item=>item.id===normalized.id);
  writeIngredients(exists?records.map(item=>item.id===normalized.id?normalized:item):[normalized,...records]);
}
