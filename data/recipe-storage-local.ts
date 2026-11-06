import { initialRecipes, normalizeRecipe, type RecipeRecord } from "./recipes";

const databaseName = "ogp-frontend-recipes-v1";
let cache: RecipeRecord[] = [];
let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("recipes", {keyPath: "id"});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = undefined; reject(new Error("No se pudieron cargar las recetas.")); };
  });
  return database;
}

async function writeRecords(records: RecipeRecord[]) {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("recipes", "readwrite");
    const store = transaction.objectStore("recipes");
    let deleted = false;
    records.forEach(record => {
      const existing = store.get(record.id);
      existing.onsuccess = () => {
        if (existing.result?.localDeletedAt) { deleted = true; transaction.abort(); return; }
        store.put({...structuredClone(record), localUpdatedAt:Date.now()});
      };
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("No se pudo guardar la receta. Revisa el espacio disponible."));
    transaction.onabort = () => reject(new Error(deleted ? "Esta receta fue eliminada. Vuelve al catálogo." : "El guardado se interrumpió. Vuelve a intentarlo."));
  });
}

export function readRecipes() { return cache; }
export async function loadRecipes(): Promise<RecipeRecord[]> {
  const db = await openDatabase();
  const records = await new Promise<(RecipeRecord & {localUpdatedAt?:number;localDeletedAt?:number})[]>((resolve,reject) => {
    const request = db.transaction("recipes", "readonly").objectStore("recipes").getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("No se pudieron cargar las recetas."));
  });
  if (!records.length) {
    const seeds = structuredClone(initialRecipes);
    await writeRecords(seeds);
    cache = seeds;
  } else cache = records.filter(record=>!record.localDeletedAt).sort((a,b) => (b.localUpdatedAt??0)-(a.localUpdatedAt??0)||a.id.localeCompare(b.id)).map(record=>{const {localUpdatedAt,localDeletedAt,...recipe}=record;void localUpdatedAt;void localDeletedAt;return normalizeRecipe(recipe);});
  return structuredClone(cache);
}
export async function findRecipe(id:string): Promise<RecipeRecord|null> {
  await loadRecipes();
  return structuredClone(cache.find(record => record.id === id) ?? null);
}
export async function createRecipe(recipe:RecipeRecord): Promise<RecipeRecord> {
  await loadRecipes();
  const saved = normalizeRecipe({...recipe, id:`LOCAL-${crypto.randomUUID()}`, status:"draft", updatedAt:dateLabel()});
  await writeRecords([saved]);
  cache = [saved, ...cache];
  return structuredClone(saved);
}
export async function upsertRecipe(recipe:RecipeRecord): Promise<RecipeRecord> {
  if (!recipe.name.trim() || !recipe.municipalityCode) throw new Error("Nombre y municipio son obligatorios para guardar.");
  const saved = normalizeRecipe({...recipe, updatedAt:dateLabel()});
  await writeRecords([saved]);
  cache = [saved, ...cache.filter(item => item.id !== saved.id)];
  return structuredClone(saved);
}
export async function deleteRecipe(id:string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve,reject) => {
    const transaction = db.transaction("recipes", "readwrite");
    const store = transaction.objectStore("recipes");
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) store.put({...request.result, localDeletedAt:Date.now()});
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("No se pudo eliminar la receta. Vuelve a intentarlo."));
    transaction.onabort = () => reject(new Error("La eliminación se interrumpió. Vuelve a intentarlo."));
  });
  cache = cache.filter(item=>item.id!==id);
}
function dateLabel() { return new Intl.DateTimeFormat("es-MX",{day:"2-digit",month:"short",year:"numeric",timeZone:"America/Mexico_City"}).format(new Date()); }
