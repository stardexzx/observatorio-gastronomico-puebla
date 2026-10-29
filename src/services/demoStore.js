import recetas from "../data/recetas.json";
import mercados from "../data/mercados.json";
import cocineras from "../data/cocineras.json";
import legales from "../data/declaratorias.json";

export const DEMO_EVENT = "ogp:demo-changed";
export const resources = {
  cocineras: {
    singular: "cocinera o cocinero",
    label: "Cocineras y cocineros",
    type: "persona",
  },
  recetas: { singular: "receta", label: "Recetas históricas", type: "receta" },
  mercados: {
    singular: "mercado",
    label: "Mercados y tianguis",
    type: "mercado",
  },
};
export const normalize = (s = "") =>
  String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const unique = (a) => [...new Set(a.filter(Boolean))];
const reciprocal = {
  cocineras: [
    ["recipeIds", "recetas", "personIds"],
    ["marketIds", "mercados", "personIds"],
  ],
  recetas: [
    ["personIds", "cocineras", "recipeIds"],
    ["marketIds", "mercados", "recipeIds"],
    ["relatedRecipeIds", "recetas", "relatedRecipeIds"],
  ],
  mercados: [
    ["personIds", "cocineras", "marketIds"],
    ["recipeIds", "recetas", "marketIds"],
  ],
};
let opening;
const storageError = () =>
  new Error(
    "No se pudo guardar en este navegador. Revisa el espacio disponible y que el almacenamiento esté permitido; tus datos siguen en el formulario.",
  );
function openStore() {
  if (!opening)
    opening = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) return reject(storageError());
      const req = indexedDB.open("ogp-demo-local", 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore("records", { keyPath: "key" });
        req.result.createObjectStore("drafts", { keyPath: "key" });
        req.result.createObjectStore("meta", { keyPath: "key" });
      };
      req.onerror = () => reject(storageError());
      req.onblocked = () =>
        reject(
          new Error(
            "Cierra otras pestañas del demo para poder abrir el almacenamiento local.",
          ),
        );
      req.onsuccess = () => {
        req.result.onversionchange = () => {
          req.result.close();
          opening = null;
        };
        resolve(req.result);
      };
    }).catch((e) => {
      opening = null;
      throw e;
    });
  return opening;
}
async function operation(stores, mode, work) {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = tx.onabort = () => reject(storageError());
    try {
      result = work(tx);
    } catch (e) {
      tx.abort();
      reject(storageError());
    }
  });
}
async function readAll(store) {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(storageError());
  });
}
function seedRecords() {
  const all = { recetas, mercados, cocineras, "proteccion-legal": legales };
  const ids = (kind, names) =>
    unique(
      (names || []).map(
        (n) =>
          all[kind].find(
            (r) => normalize(r.n) === normalize(Array.isArray(n) ? n[0] : n),
          )?.id,
      ),
    );
  const catalogs = { ingredientes: [], colectivos: [], establecimientos: [] };
  function term(kind, name, description = "") {
    if (!name?.trim()) return null;
    let found = catalogs[kind].find((r) => normalize(r.n) === normalize(name));
    if (!found) {
      found = {
        id: `ref-${catalogs[kind].length + 1}`,
        n: name,
        d: description,
        seeded: true,
      };
      catalogs[kind].push(found);
    }
    return found.id;
  }
  const rows = [];
  for (const [resource, records] of Object.entries(all))
    for (const original of records) {
      const r = structuredClone(original);
      r.seeded = true;
      if (resource === "recetas") {
        r.ingredientIds = r.ing.map(([n, d]) => term("ingredientes", n, d));
        r.ingredientNotes = Object.fromEntries(
          r.ingredientIds.map((id, i) => [id, r.ing[i][1]]),
        );
        r.personIds = ids("cocineras", r.coc);
        r.marketIds = ids("mercados", r.mer);
        r.relatedRecipeIds = ids("recetas", r.otras).filter(
          (id) => id !== r.id,
        );
        r.legalIds = [];
      }
      if (resource === "mercados") {
        r.ingredientIds = r.prod.map((n) => term("ingredientes", n));
        r.recipeIds = ids("recetas", r.rec);
        r.personIds = ids("cocineras", r.coc);
        r.v = 1;
        r.address = r.dir;
        r.services = r.svc;
      }
      if (resource === "cocineras") {
        r.recipeIds = ids("recetas", r.ins);
        r.marketIds = ids("mercados", [r.es]);
        r.collectiveId = term("colectivos", r.org);
        r.establishmentId = term("establecimientos", r.es);
        r.languages = r.len.split(/ y |, /).filter(Boolean);
        r.v = 1;
        r.oralRecords = r.oral.map(([title, detail], i) => ({
          id: `oral-${i}`,
          title,
          detail,
          date: "",
          duration: "",
          url: "",
        }));
        r.lineage = r.lin.map((label, i) => ({
          id: `line-${i}`,
          label,
          personId: "",
        }));
        r.sourceReferences = r.ver
          .filter((x) => x.startsWith("Fuente:"))
          .map((x) => x.slice(7).trim());
        r.verificationNote =
          r.ver.find((x) => x.startsWith("Verificado el")) || "";
      }
      rows.push({ ...r, key: `${resource}:${r.id}`, resource });
    }
  for (const row of rows)
    for (const [field, kind, reverse] of reciprocal[row.resource] || [])
      for (const id of row[field] || []) {
        const target = rows.find((r) => r.resource === kind && r.id === id);
        if (target)
          target[reverse] = unique([...(target[reverse] || []), row.id]);
      }
  for (const [resource, records] of Object.entries(catalogs))
    for (const r of records)
      rows.push({ ...r, key: `${resource}:${r.id}`, resource });
  return rows;
}
let initialized;
async function ready() {
  if (!initialized)
    initialized = operation(["meta", "records"], "readwrite", (tx) => {
      const meta = tx.objectStore("meta"),
        req = meta.get("seeded");
      req.onsuccess = () => {
        if (req.result) return;
        const store = tx.objectStore("records");
        for (const r of seedRecords()) store.put(r);
        meta.put({ key: "seeded", version: 1 });
      };
    }).catch((e) => {
      initialized = null;
      throw e;
    });
  return initialized;
}
export async function rawDemoRecords() {
  await ready();
  return readAll("records");
}
export async function listDemoRecords(resource) {
  return (await rawDemoRecords()).filter((r) => r.resource === resource);
}
export async function getDemoRecord(resource, id) {
  return (
    (await listDemoRecords(resource)).find((r) => r.id === String(id)) || null
  );
}
function announce() {
  window.dispatchEvent(new Event(DEMO_EVENT));
}
export async function saveDemoRecord(resource, data) {
  await ready();
  const all = await rawDemoRecords();
  const id = data.id || crypto.randomUUID();
  const previous = all.find((r) => r.resource === resource && r.id === id);
  if (!data.n?.trim()) throw new Error("Escribe el nombre del registro.");
  if (
    all.some(
      (r) =>
        r.resource === resource &&
        r.id !== id &&
        normalize(r.n) === normalize(data.n),
    )
  )
    throw new Error(
      "Ya existe un registro con ese nombre. Selecciónalo en la lista o edítalo.",
    );
  const expected = {
    recipeIds: "recetas",
    relatedRecipeIds: "recetas",
    marketIds: "mercados",
    personIds: "cocineras",
    lineagePersonIds: "cocineras",
    ingredientIds: "ingredientes",
    legalIds: "proteccion-legal",
  };
  for (const [field, kind] of Object.entries(expected))
    for (const target of data[field] || []) {
      if (
        !all.some((r) => r.resource === kind && r.id === target) ||
        (kind === resource && target === id)
      )
        throw new Error(
          "Revisa los registros relacionados: una selección ya no está disponible.",
        );
    }
  const record = {
    ...data,
    n: data.n.trim(),
    id,
    key: `${resource}:${id}`,
    resource,
    seeded: false,
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const relatedUpdates = [];
  for (const [field, kind, reverse] of reciprocal[resource] || [])
    for (const target of all.filter(
      (r) => r.resource === kind && r.key !== record.key,
    )) {
      const linked = (record[field] || []).includes(target.id);
      if (linked === (target[reverse] || []).includes(record.id)) continue;
      const updated = relatedUpdates.find((r) => r.key === target.key) || {
        ...target,
      };
      updated[reverse] = linked
        ? unique([...(updated[reverse] || []), record.id])
        : (updated[reverse] || []).filter((id) => id !== record.id);
      if (!relatedUpdates.includes(updated)) relatedUpdates.push(updated);
    }
  await operation(["records"], "readwrite", (tx) => {
    const store = tx.objectStore("records");
    store.put(record);
    for (const target of relatedUpdates) store.put(target);
  });
  announce();
  return record;
}
export async function putDemoDraft(key, draft) {
  await ready();
  await operation(["drafts"], "readwrite", (tx) =>
    tx
      .objectStore("drafts")
      .put({ ...draft, key, updatedAt: new Date().toISOString() }),
  );
}
export async function getDemoDraft(key) {
  return (await readAll("drafts")).find((d) => d.key === key) || null;
}
export async function listDemoDrafts() {
  return readAll("drafts");
}
export async function clearDemoDraft(key) {
  await operation(["drafts"], "readwrite", (tx) =>
    tx.objectStore("drafts").delete(key),
  );
}
export async function demoSnapshot() {
  const all = await rawDemoRecords();
  const groups = Object.fromEntries(
    [
      ...Object.keys(resources),
      "proteccion-legal",
      "ingredientes",
      "colectivos",
      "establecimientos",
    ].map((k) => [k, all.filter((r) => r.resource === k)]),
  );
  const lookup = (kind, id) => groups[kind]?.find((r) => r.id === id);
  const pair = (kind, ids) =>
    (ids || []).map((id) => lookup(kind, id)).filter(Boolean);
  const links = (kind, ids) =>
    pair(kind, ids).map((r) => ({
      id: r.id,
      name: r.n,
      type:
        resources[kind]?.type ||
        (kind === "proteccion-legal" ? "instrumento" : kind),
      to: `/${kind}/${r.id}`,
    }));
  // Las relaciones se resuelven en ambos sentidos; los nombres se leen del registro vigente.
  for (const kind of Object.keys(resources))
    groups[kind] = groups[kind].map((raw) => {
      const r = { ...raw, source: "demo", to: `/${kind}/${raw.id}` };
      let recipeIds = r.recipeIds || [],
        marketIds = r.marketIds || [],
        personIds = r.personIds || [];
      if (kind === "cocineras") {
        recipeIds = unique([
          ...recipeIds,
          ...groups.recetas
            .filter((x) => x.personIds?.includes(r.id))
            .map((x) => x.id),
        ]);
        marketIds = unique([
          ...marketIds,
          ...groups.mercados
            .filter((x) => x.personIds?.includes(r.id))
            .map((x) => x.id),
        ]);
        r.relations = [
          ...links("recetas", recipeIds),
          ...links("mercados", marketIds),
          ...links("cocineras", r.lineagePersonIds),
        ];
        r.rec = recipeIds.length;
        r.mer = marketIds.length;
        r.ins = pair("recetas", recipeIds).map((x) => x.n);
        r.len = r.languages?.join(", ") || r.len || "";
        r.org = lookup("colectivos", r.collectiveId)?.n || "";
        r.es = lookup("establecimientos", r.establishmentId)?.n || "";
        r.lin = [
          ...(r.lineage || []).map((x) =>
            x.personId
              ? `${lookup("cocineras", x.personId)?.n || "Persona"}${x.label ? ` · ${x.label}` : ""}`
              : x.label,
          ),
          ...pair("cocineras", r.lineagePersonIds).map((x) => x.n),
        ];
        r.oral = (r.oralRecords || []).map((x) => ({
          id: x.id,
          url: x.url,
          metadatos: {
            title: x.title,
            date: x.date,
            description: x.duration || x.detail || "",
          },
        }));
        r.ver = [
          r.v
            ? "Verificada por el Observatorio (demo)"
            : "Pendiente de verificación",
          ...(r.sourceReferences || []).map((x) => `Fuente: ${x}`),
          r.verificationNote ||
            [r.verifiedAt, r.verifiedBy].filter(Boolean).join(" · "),
        ].filter(Boolean);
        r.fu = [];
        r.c ||= "#10284C";
        r.esp ||= [];
      }
      if (kind === "recetas") {
        personIds = unique([
          ...personIds,
          ...groups.cocineras
            .filter((x) => x.recipeIds?.includes(r.id))
            .map((x) => x.id),
        ]);
        marketIds = unique([
          ...marketIds,
          ...groups.mercados
            .filter((x) => x.recipeIds?.includes(r.id))
            .map((x) => x.id),
        ]);
        const related = unique([
          ...(r.relatedRecipeIds || []),
          ...groups.recetas
            .filter((x) => x.relatedRecipeIds?.includes(r.id))
            .map((x) => x.id),
        ]);
        r.relations = [
          ...links("cocineras", personIds),
          ...links("mercados", marketIds),
          ...links("recetas", related),
          ...links("proteccion-legal", r.legalIds),
        ];
        r.ing = pair("ingredientes", r.ingredientIds).map((x) => [
          x.n,
          r.ingredientNotes?.[x.id] || x.d || "",
        ]);
        r.p ||= r.m || "";
      }
      if (kind === "mercados") {
        recipeIds = unique([
          ...recipeIds,
          ...groups.recetas
            .filter((x) => x.marketIds?.includes(r.id))
            .map((x) => x.id),
        ]);
        personIds = unique([
          ...personIds,
          ...groups.cocineras
            .filter((x) => x.marketIds?.includes(r.id))
            .map((x) => x.id),
        ]);
        r.relations = [
          ...links("recetas", recipeIds),
          ...links("cocineras", personIds),
        ];
        r.prod = pair("ingredientes", r.ingredientIds).map((x) => x.n);
        r.services ||= r.svc || [];
      }
      r.rel = r.relations?.length || 0;
      return r;
    });
  return groups;
}
export async function exportDemo() {
  return {
    application: "observatorio-gastronomico-puebla",
    version: 1,
    exportedAt: new Date().toISOString(),
    records: await rawDemoRecords(),
    drafts: await listDemoDrafts(),
  };
}
