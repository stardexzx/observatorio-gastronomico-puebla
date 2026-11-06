// Los módulos conservados consultan los catálogos del autor y las colecciones locales únicas.
import analiticaData from "../data/analitica.json";
import { demoSnapshot } from "./demoStore.js";
import { buildKnowledgeGraph, normalizedName } from "../../lib/integration/records";
import { pueblaMunicipalities } from "../../data/puebla-municipalities";
export { ensureAuthorIngredient } from "../../lib/integration/ingredients";

const copy = (value) => JSON.parse(JSON.stringify(value));
const byId = (items, id) => items.find((item) => String(item.id) === String(id) || item.slug === String(id));
// Este indicador controla únicamente la captura local de los módulos heredados.
export const usesDatabase = false;
export const sourceLabel = "Catálogos integrados · Mercados y protección legal en este navegador";
const searchText = (r) => normalizedName([
  r.n, r.d, r.bio, r.rol, r.m, r.p, r.e, r.community, r.address, r.org, r.es,
  ...(r.esp || []), ...(r.languages || []), ...(r.fu || []), ...(r.lin || []),
  ...(r.prod || []), ...(r.services || []), ...(r.sourceReferences || []),
  ...(r.ing || []).flat(), ...(r.relations || []).map((x) => x.name),
  ...(r.oralRecords || []).map((x) => x.title),
].filter(Boolean).join(" "));
async function catalog(resource, { query = "", offset = 0, limit = 12 } = {}) {
  const filtered = ((await demoSnapshot())[resource] || []).filter((item) => searchText(item).includes(normalizedName(query)));
  return { items: copy(filtered.slice(offset, offset + limit)), hasMore: offset + limit < filtered.length };
}
const detail = async (resource, id) => copy(byId((await demoSnapshot())[resource] || [], id) ?? null);
export const getRecetas = (options) => catalog("recetas", options);
export const getRecetaById = (id) => detail("recetas", id);
export const getMercados = (options) => catalog("mercados", options);
export const getMercadoById = (id) => detail("mercados", id);
export const getCocineras = (options) => catalog("cocineras", options);
export const getCocineraById = (id) => detail("cocineras", id);
export const getDeclaratorias = (options) => catalog("proteccion-legal", options);
export const getDeclaratoriaById = (id) => detail("proteccion-legal", id);
export const getGraphData = async (focus) => buildKnowledgeGraph(await demoSnapshot(), focus);
export const getInicioData = async () => {
  const all = await demoSnapshot(), result = copy(analiticaData);
  const counts = [all.ingredientes.length, all.recetas.length, all.mercados.length, all.cocineras.length, all["proteccion-legal"].length,
    new Set([...all.ingredientes, ...all.recetas, ...all.mercados, ...all.cocineras].map(codeFor).filter(Boolean)).size];
  result.kpis = result.kpis.map((k, i) => ({ ...k, value: String(counts[i]), delta: "Registros de los catálogos integrados" }));
  result.verificaciones = [...all.recetas, ...all.cocineras].filter((r) => r.v).slice(0, 5).map((r) => ({ name: r.n, municipality: r.m || r.p, verified: true, type: r.resource === "recetas" ? "receta" : "coc", date: r.verifiedAt || r.updatedAt || "" }));
  return result;
};
export const getReportData = getInicioData;
export const getLegalSummary = async () => {
  const all = await demoSnapshot(), rows = all["proteccion-legal"];
  return { activos: rows.filter((r) => r.st === "Otorgada").length, expedientes: rows.filter((r) => r.st !== "Otorgada").length,
    recetas: all.recetas.filter((r) => r.legalIds?.length).length, municipios: new Set(rows.map(codeFor).filter(Boolean)).size,
    actualizado: rows.map((r) => r.updatedAt || "").filter(Boolean).sort().at(-1) || "Sin fecha de actualización" };
};
export const mapTypes = [
  { key: "ingrediente", label: "Ingredientes", color: "#4F7A4A" },
  { key: "receta", label: "Recetas", color: "#C1531E" },
  { key: "mercado", label: "Mercados y tianguis", color: "#D89A2E" },
  { key: "persona", label: "Cocineras y cocineros", color: "#10284C" },
  { key: "instrumento", label: "Protección legal", color: "#B23A1F" },
];
let geometry;
async function municipalGeometry() {
  geometry ||= fetch("/maps/puebla-municipios.geojson").then((r) => {
    if (!r.ok) throw new Error("No se pudo cargar el mapa municipal.");
    return r.json();
  }).then((geo) => ({ ...geo, features: geo.features.map((f) => ({ ...f, properties: { ...f.properties, cvegeo: String(f.properties.cvegeo || f.properties.code || ""), nomgeo: f.properties.nomgeo || f.properties.name || "" } })) })).catch((error) => { geometry = null; throw error; });
  return geometry;
}
export const getMunicipalGeometry = municipalGeometry;
export async function getMunicipalities() { return pueblaMunicipalities.map((r) => ({ ...r })); }
function codeFor(r) {
  if (r.municipalityCode && pueblaMunicipalities.some((m) => m.code === r.municipalityCode)) return r.municipalityCode;
  let name = normalizedName(r.m || r.p || r.municipality || "").replace(/, puebla$/, "");
  if (name === "puebla de zaragoza") name = "puebla";
  return pueblaMunicipalities.find((m) => normalizedName(m.name) === name)?.code;
}
function isoDate(value = "") {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parts = normalizedName(value).match(/^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\.?\s+(\d{4})$/);
  if (!parts) return "";
  const month = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"].indexOf(parts[2]) + 1;
  return `${parts[3]}-${String(month).padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
}
export async function getMunicipalMap({ types = mapTypes.map((t) => t.key), municipality = "", query = "", from = "", to = "" } = {}) {
  const [geo, all] = await Promise.all([municipalGeometry(), demoSnapshot()]);
  const typeByResource = { ingredientes: "ingrediente", recetas: "receta", mercados: "mercado", cocineras: "persona", "proteccion-legal": "instrumento" };
  const records = Object.entries(all).filter(([resource]) => typeByResource[resource]).flatMap(([resource, rows]) => rows.map((r) => ({ ...copy(r), type: typeByResource[resource], to: r.to || `/${resource}/${encodeURIComponent(r.id)}` })))
    .filter((r) => types.includes(r.type) && searchText(r).includes(normalizedName(query)) && (!from || isoDate(r.updatedAt) >= from) && (!to || (!!isoDate(r.updatedAt) && isoDate(r.updatedAt) <= to)) && (!municipality || codeFor(r) === municipality));
  const mapped = new Map();
  for (const r of records) { const code = codeFor(r); if (!code) continue; const rows = mapped.get(code) || []; rows.push(r); mapped.set(code, rows); }
  return { type: "FeatureCollection", features: geo.features.map((f) => {
    const rows = mapped.get(f.properties.cvegeo) || [];
    return { ...f, id: f.properties.cvegeo, properties: { code: f.properties.cvegeo, name: f.properties.nomgeo, total: rows.length, counts: Object.fromEntries(mapTypes.map((t) => [t.key, rows.filter((r) => r.type === t.key).length])) } };
  }), points: records.filter((r) => r.type === "mercado" && r.coordinates?.length === 2).map((r) => ({ type: "Feature", id: r.id, geometry: { type: "Point", coordinates: r.coordinates }, properties: { nombre: r.n, tipo: r.type } })),
    records, total: records.length, mapped: records.filter(codeFor).length, limited: false };
}
export const getMapData = getMunicipalMap;
export const getPodcasts = (options) => catalog("podcasts", options);
export const getEpisodes = (options) => catalog("episodios", options);
export const getPublicRecord = async (id) => {
  const all = await demoSnapshot();
  const match = String(id).match(/^(recetas|cocineras|ingredientes|mercados|proteccion-legal):(.+)$/);
  return match ? byId(all[match[1]] || [], match[2]) || null : Object.values(all).flat().find((r) => r.id === id) || null;
};
export const getInstitutional = async () => ({ items: [], hasMore: false });
export async function searchRecords({ query = "", offset = 0, limit = 12 } = {}) {
  const labels = { recetas: "Receta", ingredientes: "Ingrediente", mercados: "Mercado", cocineras: "Cocinera o cocinero", "proteccion-legal": "Protección legal" };
  const items = Object.entries(await demoSnapshot()).filter(([kind]) => labels[kind]).flatMap(([kind, records]) => records.map((record) => ({ ...record, to: record.to || `/${kind}/${encodeURIComponent(record.id)}`, typeLabel: labels[kind] })))
    .filter((item) => searchText(item).includes(normalizedName(query)));
  return { items: copy(items.slice(offset, offset + limit)), hasMore: offset + limit < items.length };
}
