/** Pure adapters: author catalogs own identity; legacy rows only add their unique relations. */
// Legacy catalogs carry heterogeneous JSON fields; validators normalize each domain before writes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CatalogRow = Record<string, any>;
export type Catalogs = Record<string, CatalogRow[]>;
export const normalizedName = (value: unknown = "") => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
const unique = (items: string[]) => [...new Set(items.filter(Boolean))];
const strings = (items: unknown): string[] => Array.isArray(items) ? items.map((item) => typeof item === "string" ? item : String(item?.name || item?.n || "")).filter(Boolean) : [];

export function authorCatalogs(recipes: CatalogRow[], cooks: CatalogRow[], ingredients: CatalogRow[], recipeStorage = "postgres"): Catalogs {
  return {
    recetas: recipes.map((r) => ({ ...r, id: String(r.id), n: r.name, d: r.description, p: r.municipality, m: r.municipality, e: r.category, ing: strings(r.ingredients).map((name) => [name, ""]), v: ["verified", "published"].includes(r.status) ? 1 : 0, resource: "recetas", documentarySource: r.source, catalogOrigin: "author", storage: recipeStorage, source: recipeStorage === "postgres" ? "database" : "demo", to: `/recetas/${encodeURIComponent(r.id)}`, personIds: [], marketIds: [], ingredientIds: [], relatedRecipeIds: [] })),
    cocineras: cooks.map((r) => ({ ...r, id: String(r.id), n: r.name, bio: r.biography, rol: r.role, m: r.municipality, p: r.municipality, esp: r.specialties || [], languages: r.languages || [], q: r.quote || "", est: r.studentCount ?? 0, sourceReferences: r.sourceReferences || [], v: r.status === "verified" ? 1 : 0, resource: "cocineras", documentarySource: r.source, catalogOrigin: "author", storage: "local", source: "demo", to: `/cocineras/${encodeURIComponent(r.id)}`, recipeIds: [], marketIds: [], lineagePersonIds: [] })),
    ingredientes: ingredients.map((r) => ({ ...r, id: String(r.id), n: r.name, d: r.description, m: r.municipality, p: r.municipality, resource: "ingredientes", documentarySource: r.source, catalogOrigin: "author", storage: "local", source: "demo", to: `/ingredientes/${encodeURIComponent(r.id)}` })),
  };
}

export function buildUnifiedCatalogs(legacy: Catalogs, author: Catalogs, mappings: Record<string, string> = {}): Catalogs {
  const result: Catalogs = Object.fromEntries(Object.entries(legacy).map(([kind, rows]) => [kind, rows.map((r) => ({ ...r }))]));
  for (const kind of ["recetas", "cocineras", "ingredientes"]) result[kind] = (author[kind] || []).map((r) => ({ ...r }));
  const find = (kind: string, name: unknown) => result[kind]?.find((r) => normalizedName(r.n) === normalizedName(name));
  const resolve = (kind: string, id: string): string | undefined => {
    const mapped = mappings[`${kind}:${id}`];
    if (mapped && result[kind]?.some((r) => r.id === mapped)) return mapped;
    // A bare old numeric ID must never be treated as an author's identity.
    const old = legacy[kind]?.find((r) => r.id === id);
    if (["recetas", "cocineras", "ingredientes"].includes(kind) && old) return find(kind, old.n)?.id;
    return result[kind]?.find((r) => r.id === id)?.id;
  };
  const ids = (kind: string, values: string[] = []) => unique(values.map((id) => resolve(kind, id) || ""));
  const names = (kind: string, values: unknown) => unique(strings(values).map((name) => find(kind, name)?.id || ""));
  for (const [kind, rows] of Object.entries(result)) {
    result[kind] = rows.map((record) => {
      const old = ["recetas", "cocineras", "ingredientes"].includes(kind) ? legacy[kind]?.find((r) => normalizedName(r.n) === normalizedName(record.n) || mappings[`${kind}:${r.id}`] === record.id) : record;
      const r = { ...record };
      r.recipeIds = unique([...ids("recetas", old?.recipeIds), ...names("recetas", record.linkedRecipes)]);
      r.personIds = ids("cocineras", old?.personIds);
      r.marketIds = unique([...ids("mercados", old?.marketIds), ...names("mercados", record.linkedMarkets)]);
      r.ingredientIds = unique([...ids("ingredientes", old?.ingredientIds), ...names("ingredientes", record.ingredients)]);
      r.relatedRecipeIds = ids("recetas", old?.relatedRecipeIds).filter((id) => id !== r.id);
      r.lineagePersonIds = ids("cocineras", old?.lineagePersonIds);
      r.legalIds = ids("proteccion-legal", old?.legalIds);
      if (kind === "recetas" && record.informant?.name) r.personIds = unique([...r.personIds, ...names("cocineras", [record.informant.name])]);
      // Existing products remain text when the author has no matching ingredient.
      if (kind === "mercados") r.prod = unique([...(record.prod || []), ...r.ingredientIds.map((id: string) => result.ingredientes.find((x) => x.id === id)?.n || "")]);
      return r;
    });
  }
  return result;
}

export function buildKnowledgeGraph(catalogs: Catalogs, focus = "") {
  const types: Record<string, string> = { recetas: "rec", cocineras: "coc", ingredientes: "ing", mercados: "mer", "proteccion-legal": "leg" };
  const rows: (CatalogRow & { kind: string; graphId: string })[] = Object.entries(catalogs).filter(([kind]) => types[kind]).flatMap(([kind, records]) => records.map((r) => ({ ...r, kind, graphId: `${kind}:${r.id}` })));
  const nodes = rows.map((r, i) => ({ id: r.graphId, n: r.n, t: types[r.kind], to: r.to || `/${r.kind}/${encodeURIComponent(r.id)}`, r: r.kind === "recetas" ? 19 : 14, x: 380 + 295 * Math.cos((i * 2 * Math.PI) / Math.max(rows.length, 1)), y: 240 + 175 * Math.sin((i * 2 * Math.PI) / Math.max(rows.length, 1)) }));
  const valid = new Set(nodes.map((n) => n.id));
  const edges: { source: string; target: string; type: string }[] = [];
  const seen = new Set<string>();
  const fields = { recipeIds: ["recetas", "se relaciona con"], relatedRecipeIds: ["recetas", "variante"], personIds: ["cocineras", "documenta"], marketIds: ["mercados", "se encuentra en"], ingredientIds: ["ingredientes", "utiliza"], legalIds: ["proteccion-legal", "protección"], lineagePersonIds: ["cocineras", "linaje"] };
  for (const r of rows) for (const [field, [kind, type]] of Object.entries(fields)) for (const id of r[field] || []) {
    const target = `${kind}:${id}`, key = [r.graphId, target].sort().join("|");
    if (r.graphId === target || !valid.has(target) || seen.has(key)) continue;
    seen.add(key); edges.push({ source: r.graphId, target, type });
  }
  if (!focus) return { nodes, edges, partial: false };
  const selected = nodes.find((n) => n.id === focus || n.to === focus);
  if (!selected) return { nodes, edges, partial: false };
  const linked = new Set([selected.id]);
  for (const edge of edges) if (edge.source === selected.id || edge.target === selected.id) { linked.add(edge.source); linked.add(edge.target); }
  return { nodes: nodes.filter((n) => linked.has(n.id)), edges: edges.filter((e) => linked.has(e.source) && linked.has(e.target)), partial: false };
}
