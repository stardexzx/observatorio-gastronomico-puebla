import { normalizeIngredient, type IngredientRecord } from "@/data/ingredients";
import { catalogRequest } from "./catalog-storage";

// Existing local entries remain available for an explicit backup; no samples are copied to the database.
export const ingredientStorageKey="observatorio-ingredients-v1";
let cache:IngredientRecord[]=[];
export function readIngredients():IngredientRecord[]{return cache}
export async function loadIngredients():Promise<IngredientRecord[]>{
  const {records}=await catalogRequest<{records:IngredientRecord[]}>("ingredients");
  cache=records.map(normalizeIngredient);return cache;
}
export async function findIngredient(id:string):Promise<IngredientRecord|null>{
  const records=await loadIngredients();return records.find(item=>item.id===id)??null;
}
export async function upsertIngredient(record:IngredientRecord):Promise<IngredientRecord>{
  const normalized=normalizeIngredient(record),exists=cache.some(item=>item.id===normalized.id);
  const {record:saved}=await catalogRequest<{record:IngredientRecord}>("ingredients",exists?normalized.id:undefined,exists?"PUT":"POST",normalized);
  const result=normalizeIngredient(saved);cache=[result,...cache.filter(item=>item.id!==result.id)];return result;
}
export async function writeIngredients(records:IngredientRecord[]):Promise<void>{for(const record of records)await upsertIngredient(record)}
