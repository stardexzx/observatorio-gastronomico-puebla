import { initialCooks, normalizeCook, type CookRecord } from "@/data/cooks";

export const cookStorageKey="observatorio-cooks-v1";
export function readCooks():CookRecord[]{
  if(typeof window==="undefined")return initialCooks.map(normalizeCook);
  let saved:string|null;
  try{saved=window.localStorage.getItem(cookStorageKey)}catch{throw new Error("No se puede acceder al almacenamiento de cocineras y cocineros en este navegador.")}
  if(!saved)return initialCooks.map(normalizeCook);
  try{
    const records:unknown=JSON.parse(saved);
    if(!Array.isArray(records)||records.some(record=>!record||typeof record!=="object"||Array.isArray(record)))throw new Error();
    return records.map(record=>normalizeCook(record as Partial<CookRecord>));
  }catch{throw new Error("No se pudieron leer las fichas guardadas. Los datos originales se conservaron; revisa tu respaldo antes de reemplazarlos.")}
}
export function writeCooks(records:CookRecord[]){
  if(typeof window==="undefined")throw new Error("El guardado local solo está disponible en el navegador.");
  try{window.localStorage.setItem(cookStorageKey,JSON.stringify(records.map(normalizeCook)))}catch{throw new Error("No se pudo guardar la ficha en este navegador. Revisa el espacio disponible o elimina fotografías de gran tamaño. Tus cambios siguen en pantalla.")}
}
export function findCook(id:string){return readCooks().find(item=>item.id===id)??null}
export function upsertCook(record:CookRecord){
  const records=readCooks();
  const normalized=normalizeCook(record);
  const exists=records.some(item=>item.id===normalized.id);
  writeCooks(exists?records.map(item=>item.id===normalized.id?normalized:item):[normalized,...records]);
}
