// La selección es explícita: un fallo de PostgreSQL nunca se oculta con datos de muestra.
import recetasData from "../data/recetas.json";
import mercadosData from "../data/mercados.json";
import cocinerasData from "../data/cocineras.json";
import declaratoriasData from "../data/declaratorias.json";
import grafoData from "../data/grafo.json";
import analiticaData from "../data/analitica.json";
import { demoSnapshot } from "./demoStore.js";

const copy = (value) => JSON.parse(JSON.stringify(value));
const byId = (items, id) =>
  items.find(
    (item) => String(item.id) === String(id) || item.slug === String(id),
  );
export const usesDatabase = import.meta.env.VITE_DATA_SOURCE === "database";
export const sourceLabel = usesDatabase
  ? "Contenido publicado"
  : "Demo local · Los registros se guardan en este navegador";
const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
// Buscar texto de la ficha, sin incluir los bytes de fotos ni de audios.
const searchText = (r) =>
  normalize(
    [
      r.n,
      r.d,
      r.bio,
      r.rol,
      r.m,
      r.p,
      r.e,
      r.community,
      r.address,
      r.org,
      r.es,
      ...(r.esp || []),
      ...(r.languages || []),
      ...(r.fu || []),
      ...(r.lin || []),
      ...(r.prod || []),
      ...(r.services || []),
      ...(r.sourceReferences || []),
      ...(r.ing || []).flat(),
      ...(r.relations || []).map((x) => x.name),
      ...(r.oralRecords || []).map((x) => x.title),
    ]
      .filter(Boolean)
      .join(" "),
  );
async function request(path, { missing = false } = {}) {
  const response = await fetch(`/api/${path}`, {
    headers: { Accept: "application/json" },
  });
  if (missing && response.status === 404) return null;
  if (!response.ok)
    throw new Error(
      "No fue posible consultar el contenido. Intenta nuevamente más tarde.",
    );
  return response.json();
}
const demos = {
  recetas: recetasData,
  mercados: mercadosData,
  cocineras: cocinerasData,
  "proteccion-legal": declaratoriasData,
};
async function catalog(resource, { query = "", offset = 0, limit = 12 } = {}) {
  if (usesDatabase)
    return request(
      `${resource}?${new URLSearchParams({ q: query, offset, limit })}`,
    );
  const filtered = ((await demoSnapshot())[resource] || []).filter((item) =>
    searchText(item).includes(normalize(query)),
  );
  return {
    items: copy(filtered.slice(offset, offset + limit)),
    hasMore: offset + limit < filtered.length,
  };
}
const detail = async (resource, id) =>
  usesDatabase
    ? request(`${resource}/${encodeURIComponent(id)}`, { missing: true })
    : copy(byId((await demoSnapshot())[resource] || [], id) ?? null);
export const getInicioData = async () => {
  if (usesDatabase) return request("inicio");
  const all = await demoSnapshot(),
    result = copy(analiticaData);
  const counts = [
    all.ingredientes.length,
    all.recetas.length,
    all.mercados.length,
    all.cocineras.length,
    all["proteccion-legal"].length,
    new Set(
      [...all.recetas, ...all.mercados, ...all.cocineras]
        .map((r) => r.municipalityCode || r.m || r.p)
        .filter(Boolean),
    ).size,
  ];
  result.kpis = result.kpis.map((k, i) => ({
    ...k,
    value: String(counts[i]),
    delta: "Registros del demo local",
  }));
  result.verificaciones = [...all.recetas, ...all.mercados, ...all.cocineras]
    .filter((r) => r.v)
    .slice(-5)
    .reverse()
    .map((r) => ({
      name: r.n,
      municipality: r.m || r.p,
      verified: true,
      type: { recetas: "receta", mercados: "mercado", cocineras: "coc" }[
        r.resource
      ],
      date: r.verifiedAt || "Demo",
    }));
  return result;
};
export const getRecetas = (options) => catalog("recetas", options);
export const getRecetaById = (id) => detail("recetas", id);
export const getMercados = (options) => catalog("mercados", options);
export const getMercadoById = (id) => detail("mercados", id);
export const getCocineras = (options) => catalog("cocineras", options);
export const getCocineraById = (id) => detail("cocineras", id);
export const getDeclaratorias = (options) =>
  catalog("proteccion-legal", options);
export const getDeclaratoriaById = (id) => detail("proteccion-legal", id);
export const getGraphData = async (id) =>
  usesDatabase
    ? request(
        `red-conocimiento${id ? `?registro=${encodeURIComponent(id)}` : ""}`,
      )
    : copy(grafoData);
export const getReportData = async () =>
  usesDatabase ? request("reportes") : copy(analiticaData);
export const getLegalSummary = async () =>
  usesDatabase
    ? (await request("reportes")).legal
    : {
        activos: 58,
        expedientes: 14,
        recetas: 71,
        municipios: 32,
        actualizado: "2024-05-12",
      };
export const getMapData = () =>
  usesDatabase ? request("mapa") : getMunicipalMap();
export const mapTypes = [
  { key: "ingrediente", label: "Ingredientes", color: "#4F7A4A" },
  { key: "receta", label: "Recetas", color: "#C1531E" },
  { key: "mercado", label: "Mercados y tianguis", color: "#D89A2E" },
  { key: "persona", label: "Cocineras y cocineros", color: "#10284C" },
  { key: "instrumento", label: "Protección legal", color: "#B23A1F" },
];
let geometry;
async function demoGeometry() {
  geometry ||= fetch("/maps/puebla-municipios.geojson")
    .then((r) => {
      if (!r.ok) throw new Error("No se pudo cargar el mapa municipal.");
      return r.json();
    })
    .catch((error) => {
      geometry = null;
      throw error;
    });
  return geometry;
}
export const getMunicipalGeometry = () => demoGeometry();
export async function getMunicipalities() {
  return usesDatabase
    ? request("municipios")
    : (await demoGeometry()).features
        .map((f) => ({ code: f.properties.cvegeo, name: f.properties.nomgeo }))
        .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
export async function getMunicipalMap({
  types = mapTypes.map((t) => t.key),
  municipality = "",
  query = "",
  from = "",
  to = "",
} = {}) {
  if (usesDatabase)
    return request(
      `mapa-municipal?${new URLSearchParams({ tipos: types.join(","), municipio: municipality, q: query, desde: from, hasta: to })}`,
    );
  const geo = await demoGeometry(),
    typeByResource = {
      recetas: "receta",
      mercados: "mercado",
      cocineras: "persona",
      "proteccion-legal": "instrumento",
    };
  const records = Object.entries(await demoSnapshot())
    .filter(([resource]) => typeByResource[resource])
    .flatMap(([resource, rows]) =>
      rows.map((r) => ({
        ...copy(r),
        type: typeByResource[resource],
        to: `/${resource}/${r.id}`,
      })),
    )
    .filter(
      (r) =>
        types.includes(r.type) &&
        searchText(r).includes(normalize(query)) &&
        (!from || (r.updatedAt || "") >= from) &&
        (!to || (r.updatedAt || "").slice(0, 10) <= to),
    );
  const codeFor = (r) =>
    r.municipalityCode ||
    geo.features.find(
      (f) =>
        normalize(f.properties.nomgeo) ===
          normalize((r.m || r.p || "").replace(/, Puebla$/, "")) ||
        (f.properties.cvegeo === "21114" &&
          ["puebla de zaragoza", "puebla"].includes(
            normalize(r.m || r.p || ""),
          )),
    )?.properties.cvegeo;
  const selected = records.filter(
    (r) => !municipality || codeFor(r) === municipality,
  );
  return {
    type: "FeatureCollection",
    features: geo.features.map((f) => ({
      ...f,
      id: f.properties.cvegeo,
      properties: {
        code: f.properties.cvegeo,
        name: f.properties.nomgeo,
        total: selected.filter((r) => codeFor(r) === f.properties.cvegeo)
          .length,
        counts: {},
      },
    })),
    points: selected
      .filter((r) => r.type === "mercado" && r.coordinates?.length === 2)
      .map((r) => ({
        type: "Feature",
        id: r.id,
        geometry: { type: "Point", coordinates: r.coordinates },
        properties: { nombre: r.n, tipo: r.type },
      })),
    records: selected,
    total: selected.length,
    mapped: selected.filter(codeFor).length,
    limited: false,
  };
}
export const getPodcasts = (options) => catalog("podcasts", options);
export const getEpisodes = (options) => catalog("episodios", options);
export const getPublicRecord = async (id) =>
  usesDatabase
    ? request(`registros/${encodeURIComponent(id)}`, { missing: true })
    : Object.values(await demoSnapshot())
        .flat()
        .find((r) => r.id === id) || null;
export const getInstitutional = async () =>
  usesDatabase
    ? request("institucional?limit=50")
    : { items: [], hasMore: false };
export async function searchRecords({
  query = "",
  offset = 0,
  limit = 12,
} = {}) {
  if (usesDatabase)
    return request(
      `buscar?${new URLSearchParams({ q: query, offset, limit })}`,
    );
  const items = Object.entries(await demoSnapshot())
    .filter(([resource]) => resource in demos)
    .flatMap(([resource, records]) =>
      records.map((record) => ({
        ...record,
        to: `/${resource}/${record.id}`,
        typeLabel: {
          recetas: "Receta",
          mercados: "Mercado",
          cocineras: "Cocinera o cocinero",
          "proteccion-legal": "Protección legal",
        }[resource],
      })),
    );
  const filtered = items.filter((item) =>
    searchText(item).includes(normalize(query)),
  );
  return {
    items: copy(filtered.slice(offset, offset + limit)),
    hasMore: offset + limit < filtered.length,
  };
}
