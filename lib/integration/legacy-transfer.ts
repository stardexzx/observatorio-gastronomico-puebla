import { normalizeRecipe } from "@/data/recipes";
import { normalizeCook } from "@/data/cooks";
import { pueblaMunicipalities } from "@/data/puebla-municipalities";
import { normalizedName, type CatalogRow, type Catalogs } from "./records";

export type LegacyArchive = { exists: boolean; application: string; version: number; exportedAt: string; records: CatalogRow[]; drafts: CatalogRow[] };
export type ImportPreview = { key: string; record: CatalogRow; kind: "recetas" | "cocineras"; name: string; municipalityCode: string; duplicateId: string; missing: string[]; blocked: string[] };
const unique = (rows: string[]) => [...new Set(rows.filter(Boolean))];
const list = (value: unknown): string[] => Array.isArray(value) ? value.map((item) => typeof item === "string" ? item : Array.isArray(item) ? String(item[0] || "") : String(item?.n || item?.name || "")).filter(Boolean) : [];

function openExisting(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Este navegador no permite leer el almacenamiento local."));
  return new Promise((resolve, reject) => {
    let absent = false;
    const request = indexedDB.open("ogp-demo-local");
    request.onupgradeneeded = () => { absent = true; request.transaction?.abort(); resolve(null); };
    request.onerror = () => { if (!absent) reject(new Error("No se pudo leer la colección anterior.")); };
    request.onblocked = () => reject(new Error("Cierra las otras pestañas del observatorio para leer la colección anterior."));
    request.onsuccess = () => { if (absent) { request.result.close(); return; } resolve(request.result); };
  });
}

/** Aborts creation when the old database is absent; never invokes the demo seeder. */
export async function readLegacyArchive(): Promise<LegacyArchive> {
  const empty = { exists: false, application: "observatorio-gastronomico-puebla", version: 1, exportedAt: new Date().toISOString(), records: [], drafts: [] };
  if (typeof indexedDB !== "undefined" && typeof indexedDB.databases === "function") {
    const databases = await indexedDB.databases();
    if (!databases.some((db) => db.name === "ogp-demo-local")) return empty;
  }
  const db = await openExisting();
  if (!db) return empty;
  try {
    const stores = ["records", "drafts"].filter((name) => db.objectStoreNames.contains(name));
    if (!stores.length) return { ...empty, exists: true };
    const contents = await new Promise<Record<string, CatalogRow[]>>((resolve, reject) => {
      const tx = db.transaction(stores, "readonly"), result: Record<string, CatalogRow[]> = {};
      for (const name of stores) { const request = tx.objectStore(name).getAll(); request.onsuccess = () => { result[name] = request.result; }; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(new Error("No se pudo completar la lectura. Los registros anteriores siguen guardados."));
    });
    return { ...empty, exists: true, records: contents.records || [], drafts: contents.drafts || [] };
  } finally { db.close(); }
}

export async function preserveLegacyArchive(archive: LegacyArchive) {
  const db = await openExisting();
  if (!db || !db.objectStoreNames.contains("meta")) { db?.close(); throw new Error("Descarga el respaldo y vuelve a abrir la colección anterior antes de importar."); }
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("meta", "readwrite");
      tx.objectStore("meta").put({ key: "integration-backup-v1", archive, createdAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(new Error("No hay espacio para conservar el respaldo. Descárgalo y libera espacio antes de importar."));
    });
  } finally { db.close(); }
}

export function legacyMunicipalityCode(record: CatalogRow) {
  if (pueblaMunicipalities.some((m) => m.code === record.municipalityCode)) return record.municipalityCode;
  let name = normalizedName(record.m || record.p || record.municipality || "").replace(/, puebla$/, "");
  if (name === "puebla de zaragoza") name = "puebla";
  return pueblaMunicipalities.find((m) => normalizedName(m.name) === name)?.code || "";
}

export function planLegacyImport(archive: LegacyArchive, author: Catalogs): ImportPreview[] {
  const seen: Record<string, Set<string>> = { recetas: new Set(), cocineras: new Set() };
  return archive.records.filter((r) => ["recetas", "cocineras"].includes(r.resource) && r.seeded !== true).map((record) => {
    const kind = record.resource as ImportPreview["kind"], name = String(record.n || "").trim(), key = record.key || `${kind}:${record.id}`;
    const nameKey = normalizedName(name), duplicateId = author[kind]?.find((r) => normalizedName(r.n || r.name) === nameKey)?.id || "";
    const municipalityCode = legacyMunicipalityCode(record), blocked: string[] = [], missing: string[] = [];
    if (!name) blocked.push("Falta el nombre");
    if (!municipalityCode) blocked.push("Falta un municipio válido de Puebla");
    if (seen[kind].has(nameKey)) blocked.push("Nombre repetido en la colección anterior");
    seen[kind].add(nameKey);
    if (!(record.sourceReferences?.length || record.fu?.length)) missing.push("Fuente documental por completar");
    if (kind === "recetas" && !(record.steps?.length || record.preparation)) missing.push("Pasos de preparación por completar");
    if (kind === "cocineras" && !record.consent) missing.push("Consentimiento por registrar");
    if (record.photos?.length) missing.push("Las fotos compatibles se trasladan; el respaldo conserva todos los adjuntos");
    return { key, record, kind, name, municipalityCode, duplicateId, missing, blocked };
  });
}

function relatedNames(archive: LegacyArchive, kind: string, ids: string[] = []) { return ids.map((id) => archive.records.find((r) => r.resource === kind && r.id === id)?.n || "").filter(Boolean); }
function photos(record: CatalogRow) {
  return (record.photos || []).flatMap((photo: CatalogRow, index: number) => {
    const url = String(photo.url || ""), match = url.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return [];
    const size = Math.floor(match[2].length * 3 / 4) - (match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0);
    if (size < 1 || size > 8 * 1024 * 1024) return [];
    return [{ id: String(photo.id || `foto-${index + 1}`), name: photo.name || photo.metadatos?.title || "Fotografía anterior", caption: photo.caption || photo.metadatos?.alt || "", url, type: match[1], size }];
  }).slice(0, 50);
}

export function legacyRecipeDraft(preview: ImportPreview, archive: LegacyArchive) {
  const r = preview.record;
  const ingredientNames = list(r.ing).length ? list(r.ing) : relatedNames(archive, "ingredientes", r.ingredientIds);
  const steps = (r.steps || []).map((s: unknown) => typeof s === "string" ? s : String((s as CatalogRow)?.instrucciones || "")).filter(Boolean);
  return normalizeRecipe({ name: preview.name, description: r.d || "", municipality: pueblaMunicipalities.find((m) => m.code === preview.municipalityCode)?.name || "", municipalityCode: preview.municipalityCode,
    status: "draft", sourceReference: unique([...list(r.sourceReferences), ...list(r.fu)]).join("\n"), source: "", consultationDate: r.consultationDate || "", ingredients: unique(ingredientNames), steps, preparation: r.preparation || "", photos: photos(r) });
}

export function legacyCookDraft(preview: ImportPreview, archive: LegacyArchive) {
  const r = preview.record;
  const lookup = (kind: string, id: string) => archive.records.find((x) => x.resource === kind && x.id === id)?.n || "";
  const lineage = (r.lineage || []).map((entry: CatalogRow) => [lookup("cocineras", entry.personId), entry.label].filter(Boolean).join(" · "));
  const oral = (r.oralRecords || []).map((entry: CatalogRow, index: number) => ({ id: String(entry.id || `oral-${index + 1}`), title: entry.title || "", date: entry.date || "", duration: entry.duration || entry.detail || "", url: entry.url || "" }));
  return normalizeCook({ id: crypto.randomUUID(), name: preview.name, role: r.rol || "", municipality: pueblaMunicipalities.find((m) => m.code === preview.municipalityCode)?.name || "", municipalityCode: preview.municipalityCode,
    region: r.region || "", community: r.community || "", status: "draft", biography: r.bio || "", languages: r.languages || String(r.len || "").split(/ y |, /).filter(Boolean), specialties: r.esp || [],
    quote: r.q || "", studentCount: Number(r.est) || 0, collective: lookup("colectivos", r.collectiveId) || r.org || "", establishments: unique([lookup("establecimientos", r.establishmentId) || r.es || ""]),
    linkedRecipes: unique([...relatedNames(archive, "recetas", r.recipeIds), ...list(r.ins)]), linkedMarkets: relatedNames(archive, "mercados", r.marketIds), culinaryLineage: unique([...lineage, ...list(r.lin)]), oralHistories: oral,
    sourceReferences: list(r.sourceReferences), sourceReference: list(r.sourceReferences).join("\n"), source: "", consent: r.consent === true, verifiedAt: r.verifiedAt || "", verifiedBy: r.verifiedBy || "", photos: photos(r), updatedAt: new Date().toISOString() });
}
