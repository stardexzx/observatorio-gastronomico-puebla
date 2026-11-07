import { normalizeCook, type CookRecord } from "@/data/cooks";
import { catalogRequest } from "./catalog-storage";

// Retained as an archive identifier. Existing local entries are never overwritten or uploaded automatically.
export const cookStorageKey="observatorio-cooks-v1";
let cache:CookRecord[]=[];
export function readCooks():CookRecord[]{return cache}
export async function loadCooks():Promise<CookRecord[]>{
  const {records}=await catalogRequest<{records:CookRecord[]}>("cooks");
  cache=records.map(normalizeCook);return cache;
}
export async function findCook(id:string):Promise<CookRecord|null>{
  const records=await loadCooks();return records.find(item=>item.id===id)??null;
}
export async function upsertCook(record:CookRecord):Promise<CookRecord>{
  const normalized=normalizeCook(record),exists=cache.some(item=>item.id===normalized.id);
  const {record:saved}=await catalogRequest<{record:CookRecord}>("cooks",exists?normalized.id:undefined,exists?"PUT":"POST",normalized);
  const result=normalizeCook(saved);cache=[result,...cache.filter(item=>item.id!==result.id)];return result;
}
export async function writeCooks(records:CookRecord[]):Promise<void>{for(const record of records)await upsertCook(record)}
