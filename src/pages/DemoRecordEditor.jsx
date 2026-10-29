import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  clearDemoDraft,
  demoSnapshot,
  getDemoDraft,
  getDemoRecord,
  normalize,
  putDemoDraft,
  resources,
  saveDemoRecord,
} from "../services/demoStore.js";
import { getMunicipalities } from "../services/api.js";
import {
  EntryList,
  Field,
  RelatedPicker,
  TextField,
  readLocalFile,
} from "../components/demo/RecordFields.jsx";
import LocationPicker from "../components/demo/LocationPicker.jsx";

const TITLES = {
  cocineras: "Nueva cocinera o cocinero",
  recetas: "Nueva receta histórica",
  mercados: "Nuevo mercado o tianguis",
};
const SERVICE_OPTIONS = [
  "Estacionamiento",
  "Sanitarios",
  "Rampas de acceso",
  "Pago electrónico",
  "Wi-Fi",
  "Área de comidas",
];
const emptyRecord = () => ({
  n: "",
  bio: "",
  rol: "",
  q: "",
  esp: [],
  languages: [],
  m: "",
  p: "",
  municipalityCode: "",
  community: "",
  est: "",
  recipeIds: [],
  marketIds: [],
  personIds: [],
  lineagePersonIds: [],
  relatedRecipeIds: [],
  ingredientIds: [],
  ingredientNotes: {},
  legalIds: [],
  collectiveId: "",
  establishmentId: "",
  lineage: [],
  oralRecords: [],
  sourceReferences: [],
  photos: [],
  v: 0,
  verifiedAt: "",
  verifiedBy: "",
  verificationNote: "",
  d: "",
  e: "",
  li: "",
  lin: [],
  fu: [],
  tp: "Mercado tradicional",
  address: "",
  h: "",
  services: [],
});
export function draftKeyFor(path) {
  const url = new URL(path, window.location.origin);
  const match = url.pathname.match(
    /^\/admin\/(cocineras|recetas|mercados)\/([^/]+)$/,
  );
  if (!match || url.origin !== window.location.origin) return null;
  return `${match[1]}:${match[2] === "nueva" ? `nueva:${url.searchParams.get("borrador") || ""}` : match[2]}`;
}
export default function DemoRecordEditor({ resource }) {
  const { id } = useParams(),
    [params, setParams] = useSearchParams(),
    location = useLocation();
  useEffect(() => {
    if (!id && !params.get("borrador")) {
      const next = new URLSearchParams(params);
      next.set("borrador", crypto.randomUUID());
      setParams(next, { replace: true });
    }
  }, [id, params.toString()]);
  if (!id && !params.get("borrador"))
    return <p role="status">Preparando formulario…</p>;
  return (
    <RecordForm
      key={`${resource}:${id || params.get("borrador")}`}
      resource={resource}
      id={id}
      path={location.pathname + location.search}
    />
  );
}
function RecordForm({ resource, id, path }) {
  const [data, setData] = useState(null),
    [catalogs, setCatalogs] = useState(null),
    [tab, setTab] = useState("general");
  const [error, setError] = useState(""),
    [draftStatus, setDraftStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [reading, setReading] = useState(false),
    [term, setTerm] = useState(null);
  const saving = useRef(false),
    timer = useRef(null),
    navigate = useNavigate(),
    location = useLocation();
  const params = new URLSearchParams(location.search),
    key = draftKeyFor(path);
  const person = resource === "cocineras",
    recipe = resource === "recetas",
    market = resource === "mercados";
  const tabs = [
    ["general", "Identidad y descripción"],
    ["origen", "Origen y ubicación"],
    ["vinculos", "Registros relacionados"],
    [
      "historia",
      person
        ? "Historia oral y linaje"
        : recipe
          ? "Fuentes y linaje"
          : "Servicios y productos",
    ],
    ["respaldo", "Verificación y respaldo"],
  ];
  useEffect(() => {
    let live = true;
    Promise.all([
      getDemoDraft(key),
      id ? getDemoRecord(resource, id) : null,
      demoSnapshot(),
      getMunicipalities(),
    ])
      .then(([draft, record, all, municipalities]) => {
        if (!live) return;
        if (id && !record)
          throw new Error("No se encontró el registro que quieres editar.");
        const initial = {
          ...emptyRecord(),
          ...(draft?.data || record || {}),
          n: draft?.data?.n ?? record?.n ?? params.get("nombre") ?? "",
        };
        if (!initial.municipalityCode) {
          const name = normalize(
            (initial.m || initial.p || "").replace(/, Puebla$/, ""),
          );
          const municipality = municipalities.find(
            (m) =>
              normalize(m.name) === name ||
              (m.code === "21114" &&
                ["puebla", "puebla de zaragoza"].includes(name)),
          );
          if (municipality) {
            initial.municipalityCode = municipality.code;
            initial.m = municipality.name;
            if (recipe) initial.p = municipality.name;
          }
        }
        setCatalogs(all);
        setData(initial);
        if (draft) setDraftStatus("Borrador recuperado");
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
      clearTimeout(timer.current);
    };
  }, [key, resource, id]);
  const persist = async (current) =>
    putDemoDraft(key, {
      resource,
      data: current,
      path,
      name: current.n || TITLES[resource],
    });
  useEffect(() => {
    if (!data || saving.current) return;
    setDraftStatus("Cambios pendientes de guardar…");
    timer.current = setTimeout(() => {
      persist(data)
        .then(() => setDraftStatus("Borrador guardado en este navegador"))
        .catch((e) => {
          setDraftStatus("No se pudo guardar el borrador");
          setError(e.message);
        });
    }, 400);
    return () => clearTimeout(timer.current);
  }, [data]);
  const update = (field, value) =>
    setData((old) => ({
      ...old,
      [field]: value,
      ...(["verifiedAt", "verifiedBy"].includes(field)
        ? { verificationNote: "" }
        : {}),
    }));
  async function createRelated(kind, field, name = "") {
    setError("");
    clearTimeout(timer.current);
    try {
      await persist(data);
      const next = new URLSearchParams({
        volver: path,
        campo: field,
        borrador: crypto.randomUUID(),
      });
      if (name.trim()) next.set("nombre", name.trim());
      navigate(`/admin/${kind}/nueva?${next}`);
    } catch (e) {
      setError(e.message);
    }
  }
  async function save(e) {
    e.preventDefault();
    setError("");
    const students =
      data.est === "" || data.est == null ? null : Number(data.est);
    if (!data.n.trim()) {
      setTab("general");
      setError("Escribe el nombre del registro.");
      return;
    }
    if (
      person &&
      students !== null &&
      (!Number.isInteger(students) || students < 0 || students > 100000)
    ) {
      setTab("vinculos");
      setError(
        "La cantidad de estudiantes debe ser un número entero entre 0 y 100000.",
      );
      return;
    }
    if (!data.municipalityCode) {
      setTab("origen");
      setError(
        "Selecciona el municipio en el mapa o en la búsqueda para guardar el registro.",
      );
      return;
    }
    if (person && data.oralRecords.some((r) => !r.title.trim())) {
      setTab("historia");
      setError(
        "Añade un título a cada historia oral o quita los relatos vacíos.",
      );
      return;
    }
    clearTimeout(timer.current);
    saving.current = true;
    setBusy(true);
    try {
      const record = await saveDemoRecord(resource, {
        ...data,
        ...(person ? { est: students } : {}),
      });
      setData((old) => ({ ...old, id: record.id }));
      const returnTo = params.get("volver"),
        parentKey = returnTo && draftKeyFor(returnTo),
        field = params.get("campo");
      if (
        parentKey &&
        [
          "recipeIds",
          "marketIds",
          "personIds",
          "relatedRecipeIds",
          "lineagePersonIds",
        ].includes(field)
      ) {
        const parent = await getDemoDraft(parentKey);
        if (!parent)
          throw new Error(
            "El registro se guardó, pero no se encontró el borrador de origen. Puedes vincularlo al abrir ese formulario.",
          );
        parent.data[field] = [
          ...new Set([...(parent.data[field] || []), record.id]),
        ];
        await putDemoDraft(parentKey, parent);
      }
      await clearDemoDraft(key);
      navigate(parentKey ? returnTo : `/${resource}/${record.id}`, {
        replace: true,
      });
    } catch (e) {
      setError(e.message);
      saving.current = false;
      setBusy(false);
    }
  }
  async function attach(file, type, action) {
    setError("");
    setReading(true);
    try {
      const url = await readLocalFile(file, type);
      if (url) action(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setReading(false);
    }
  }
  const related = (label, kind, field, options = {}) => (
    <RelatedPicker
      key={field}
      label={label}
      items={catalogs[kind] || []}
      selected={data[field] || []}
      exclude={resource === kind ? id : null}
      onChange={(value) => update(field, value)}
      onCreate={
        options.create === false
          ? undefined
          : (query) => createRelated(kind, field, query)
      }
      createLabel={`+ Registrar ${resources[kind]?.singular || "registro"}`}
      {...options}
    />
  );
  const text = (label, field, options = {}) => (
    <TextField
      label={label}
      value={data[field]}
      onChange={(value) => update(field, value)}
      {...options}
    />
  );
  if (!data || !catalogs)
    return (
      <section className="g-card">
        {error ? (
          <p className="editor-error" role="alert">
            {error}
          </p>
        ) : (
          <p role="status">Cargando formulario local…</p>
        )}
        <Link to="/admin">Volver a registros</Link>
      </section>
    );
  const returnTo = params.get("volver"),
    back = returnTo && draftKeyFor(returnTo) ? returnTo : `/admin/${resource}`;
  return (
    <>
      <Link className="detail-back" to={back}>
        ← {returnTo ? "Volver al registro anterior" : "Volver a registros"}
      </Link>
      <div className="editor-heading">
        <div className="g-h">
          <h1>
            {id ? `Editar ${resources[resource].singular}` : TITLES[resource]}
          </h1>
          <p>
            {person
              ? "Una ficha para quienes preservan y transmiten la cocina poblana."
              : recipe
                ? "Documenta la receta, su origen y sus vínculos con el patrimonio gastronómico."
                : "Registra el espacio de abasto, sus productos y las personas que lo hacen posible."}
          </p>
        </div>
        <span className="g-tag gold">Guardado local</span>
      </div>
      {returnTo && (
        <p className="demo-return-note">
          Al guardar volverás al formulario anterior con este registro
          seleccionado.
        </p>
      )}
      <form onSubmit={save} className="demo-record-form" noValidate>
        <div className="demo-form-toolbar">
          <span className="g-sm" role="status">
            {draftStatus}
          </span>
          <div>
            <button
              className="g-btn"
              type="button"
              disabled={busy || reading}
              onClick={async () => {
                clearTimeout(timer.current);
                try {
                  await persist(data);
                  setDraftStatus("Borrador guardado en este navegador");
                  setError("");
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Guardar borrador
            </button>
            <button
              className="g-btn p"
              type="submit"
              disabled={busy || reading}
            >
              {busy
                ? "Guardando…"
                : reading
                  ? "Leyendo archivo…"
                  : "Guardar registro"}
            </button>
          </div>
        </div>
        {error && (
          <p className="editor-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-layout">
          <nav className="editor-tabs" aria-label="Secciones del registro">
            {tabs.map(([value, label], i) => (
              <button
                type="button"
                className={tab === value ? "on" : ""}
                aria-current={tab === value ? "step" : undefined}
                key={value}
                onClick={() => setTab(value)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {label}
              </button>
            ))}
          </nav>
          <section className="g-card editor-section">
            <h2>{tabs.find((x) => x[0] === tab)[1]}</h2>
            <div className="editor-form-grid">
              <div
                className={
                  tab === "general" ? "demo-section-fields wide" : "demo-hidden"
                }
              >
                {text(
                  person
                    ? "Nombre público"
                    : recipe
                      ? "Nombre de la receta"
                      : "Nombre del mercado",
                  "n",
                  { required: true },
                )}
                {person && (
                  <>
                    {text("Presentación o rol", "rol", {
                      placeholder: "Ej. Cocinera tradicional de Cuetzalan",
                    })}
                    {text("Frase o testimonio", "q", { multiline: true })}
                    {text("Biografía", "bio", { multiline: true })}
                    <EntryList
                      label="Lenguas"
                      values={data.languages}
                      onChange={(value) => update("languages", value)}
                      placeholder="Ej. Náhuatl"
                    />
                    <EntryList
                      label="Especialidades"
                      values={data.esp}
                      onChange={(value) => update("esp", value)}
                      placeholder="Ej. Cocina ritual"
                    />
                    <Field
                      label="Fotografía o retrato"
                      help="JPG, PNG o WEBP. Hasta 8 MB."
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={reading}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          attach(file, "image", (url) =>
                            update("photos", [
                              {
                                id: crypto.randomUUID(),
                                url,
                                metadatos: {
                                  title: data.n,
                                  alt: `Retrato de ${data.n || "la persona registrada"}`,
                                },
                              },
                            ]),
                          );
                          e.target.value = "";
                        }}
                      />
                    </Field>
                    {!!data.photos?.length && (
                      <div className="demo-photo-preview">
                        <img
                          src={data.photos[0].url}
                          alt="Retrato seleccionado"
                        />
                        <button
                          className="g-btn"
                          type="button"
                          onClick={() => update("photos", [])}
                        >
                          Quitar retrato
                        </button>
                      </div>
                    )}
                  </>
                )}
                {!person && text("Descripción", "d", { multiline: true })}
                {recipe &&
                  text("Época o referencia histórica", "e", {
                    placeholder: "Ej. Época virreinal (siglo XVII–XVIII)",
                  })}
                {market && (
                  <>
                    <Field label="Tipo de mercado">
                      <select
                        value={data.tp}
                        onChange={(e) => update("tp", e.target.value)}
                      >
                        <option>Mercado tradicional</option>
                  <option>Mercado municipal</option>
                        <option>Tianguis</option>
                      </select>
                    </Field>
                    {text("Horario y días de operación", "h", {
                      placeholder: "Ej. Lun – Dom · 6:00 – 16:00",
                    })}
                  </>
                )}
              </div>
              {tab === "origen" && (
                <>
                  <LocationPicker
                    value={data.municipalityCode}
                    name={data.m || data.p}
                    coordinates={data.coordinates}
                    precise={market}
                    onChange={({ code, name, coordinates }) =>
                      setData((old) => ({
                        ...old,
                        municipalityCode: code,
                        m: name,
                        p: recipe ? name : old.p,
                        coordinates,
                      }))
                    }
                  />
                  {person && text("Comunidad o localidad", "community")}
                  {market &&
                    text("Dirección", "address", {
                      multiline: true,
                      placeholder:
                        "Calle, número, colonia y referencias para llegar",
                    })}
                </>
              )}
              {tab === "vinculos" && (
                <>
                  {!recipe &&
                    related(
                      person ? "Recetas insignia" : "Recetas relacionadas",
                      "recetas",
                      "recipeIds",
                    )}
                  {!market &&
                    related("Mercados vinculados", "mercados", "marketIds")}
                  {!person &&
                    related(
                      "Cocineras y cocineros relacionados",
                      "cocineras",
                      "personIds",
                    )}
                  {recipe &&
                    related(
                      "Otras recetas relacionadas",
                      "recetas",
                      "relatedRecipeIds",
                    )}
                  {recipe &&
                    related(
                      "Protección legal vinculada",
                      "proteccion-legal",
                      "legalIds",
                      { create: false },
                    )}
                  {person && (
                    <>
                      <RelatedPicker
                        label="Colectivo u organización"
                        items={catalogs.colectivos}
                        selected={data.collectiveId ? [data.collectiveId] : []}
                        single
                        onChange={(ids) => update("collectiveId", ids[0] || "")}
                        onCreate={(query) =>
                          setTerm({
                            resource: "colectivos",
                            field: "collectiveId",
                            n: query,
                          })
                        }
                        createLabel="+ Agregar colectivo"
                      />
                      <RelatedPicker
                        label="Establecimiento vinculado"
                        items={catalogs.establecimientos}
                        selected={
                          data.establishmentId ? [data.establishmentId] : []
                        }
                        single
                        onChange={(ids) =>
                          update("establishmentId", ids[0] || "")
                        }
                        onCreate={(query) =>
                          setTerm({
                            resource: "establecimientos",
                            field: "establishmentId",
                            n: query,
                          })
                        }
                        createLabel="+ Agregar establecimiento"
                      />
                      {text("Estudiantes", "est", {
                        type: "number",
                        min: 0,
                        max: 100000,
                        step: 1,
                        help: "Cantidad de estudiantes que se muestra en la ficha.",
                      })}
                      <p className="foot-note wide">
                        Los totales de recetas y mercados se calculan con los
                        registros vinculados.
                      </p>
                    </>
                  )}
                </>
              )}
              {tab === "historia" && (
                <>
                  {person && (
                    <>
                      <EntryList
                        label="Etapas del linaje culinario"
                        values={data.lineage.map((x) => x.label)}
                        onChange={(values) =>
                          update(
                            "lineage",
                            values.map((label, i) => ({
                              id: `line-${i}`,
                              label,
                              personId: "",
                            })),
                          )
                        }
                        placeholder="Ej. Bisabuela · Cocina tradicional"
                      />
                      {related(
                        "Cocineras y cocineros del linaje",
                        "cocineras",
                        "lineagePersonIds",
                        {
                          help: "Vincula a las personas que ya cuentan con una ficha.",
                        },
                      )}
                      <div className="wide demo-oral">
                        <h3>Registros de historia oral</h3>
                        {data.oralRecords.map((oral, i) => (
                          <div className="demo-oral-row" key={oral.id}>
                            <h4>Historia oral {i + 1}</h4>
                            <TextField
                              label={`Título del relato ${i + 1}`}
                              value={oral.title}
                              onChange={(value) =>
                                update(
                                  "oralRecords",
                                  data.oralRecords.map((x) =>
                                    x.id === oral.id
                                      ? { ...x, title: value }
                                      : x,
                                  ),
                                )
                              }
                            />
                            <div className="editor-form-grid">
                              <TextField
                                label={`Fecha del relato ${i + 1}`}
                                type="date"
                                value={oral.date}
                                onChange={(value) =>
                                  update(
                                    "oralRecords",
                                    data.oralRecords.map((x) =>
                                      x.id === oral.id
                                        ? { ...x, date: value }
                                        : x,
                                    ),
                                  )
                                }
                              />
                              <TextField
                                label={`Duración del relato ${i + 1}`}
                                value={oral.duration || oral.detail}
                                placeholder="Ej. 18:45 min"
                                onChange={(value) =>
                                  update(
                                    "oralRecords",
                                    data.oralRecords.map((x) =>
                                      x.id === oral.id
                                        ? { ...x, duration: value }
                                        : x,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <Field
                              label={`Audio del relato ${i + 1}`}
                              help="MP3, WAV, M4A, OGG o WEBM. Hasta 25 MB."
                            >
                              <input
                                type="file"
                                accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm,.m4a"
                                disabled={reading}
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  attach(file, "audio", (url) =>
                                    setData((old) => ({
                                      ...old,
                                      oralRecords: old.oralRecords.map((x) =>
                                        x.id === oral.id ? { ...x, url } : x,
                                      ),
                                    })),
                                  );
                                  e.target.value = "";
                                }}
                              />
                            </Field>
                            {oral.url && (
                              <audio controls src={oral.url} preload="none" />
                            )}
                            <button
                              className="g-btn"
                              type="button"
                              onClick={() =>
                                update(
                                  "oralRecords",
                                  data.oralRecords.filter(
                                    (x) => x.id !== oral.id,
                                  ),
                                )
                              }
                            >
                              Quitar relato {i + 1}
                            </button>
                          </div>
                        ))}
                        <button
                          className="g-btn"
                          type="button"
                          onClick={() =>
                            update("oralRecords", [
                              ...data.oralRecords,
                              {
                                id: crypto.randomUUID(),
                                title: "",
                                date: "",
                                duration: "",
                                url: "",
                              },
                            ])
                          }
                        >
                          + Agregar historia oral
                        </button>
                      </div>
                    </>
                  )}
                  {recipe && (
                    <>
                      <EntryList
                        label="Fuentes históricas"
                        values={data.fu}
                        onChange={(value) => update("fu", value)}
                        placeholder="Nombre de la fuente o archivo"
                      />
                      {text("Descripción del linaje de preparación", "li", {
                        multiline: true,
                      })}
                      <EntryList
                        label="Etapas del linaje de preparación"
                        values={data.lin}
                        onChange={(value) => update("lin", value)}
                        placeholder="Ej. Cocinas conventuales (siglo XVII)"
                      />
                    </>
                  )}
                  {(recipe || market) && (
                    <>
                      <RelatedPicker
                        label={
                          recipe
                            ? "Ingredientes principales"
                            : "Productos destacados"
                        }
                        items={catalogs.ingredientes}
                        selected={data.ingredientIds}
                        onChange={(value) => update("ingredientIds", value)}
                        onCreate={(query) =>
                          setTerm({
                            resource: "ingredientes",
                            field: "ingredientIds",
                            n: query,
                          })
                        }
                        createLabel="+ Agregar ingrediente o producto"
                      />
                      {recipe &&
                        data.ingredientIds.map((ingredientId) => (
                          <TextField
                            key={ingredientId}
                            label={`Descripción de ${catalogs.ingredientes.find((x) => x.id === ingredientId)?.n || "ingrediente"}`}
                            value={data.ingredientNotes[ingredientId]}
                            placeholder="Ej. Base de la salsa · San Andrés Calpan"
                            onChange={(value) =>
                              update("ingredientNotes", {
                                ...data.ingredientNotes,
                                [ingredientId]: value,
                              })
                            }
                          />
                        ))}
                    </>
                  )}
                  {market && (
                    <fieldset className="demo-related wide">
                      <legend>Servicios y accesibilidad</legend>
                      <div className="demo-services">
                        {SERVICE_OPTIONS.map((service) => (
                          <label className="editor-check" key={service}>
                            <input
                              type="checkbox"
                              checked={data.services.includes(service)}
                              onChange={(e) =>
                                update(
                                  "services",
                                  e.target.checked
                                    ? [...data.services, service]
                                    : data.services.filter(
                                        (s) => s !== service,
                                      ),
                                )
                              }
                            />
                            {service}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  )}
                </>
              )}
              {tab === "respaldo" && (
                <>
                  <label className="editor-check wide">
                    <input
                      type="checkbox"
                      checked={!!data.v}
                      onChange={(e) => update("v", e.target.checked ? 1 : 0)}
                    />
                    Marcar como verificada en el demo
                  </label>
                  <p className="foot-note wide">
                    Esta marca permite probar cómo se muestra la verificación en
                    la ficha.
                  </p>
                  {person && (
                    <EntryList
                      label="Fuentes de respaldo"
                      values={data.sourceReferences}
                      onChange={(value) => update("sourceReferences", value)}
                      placeholder="Ej. Foro Mundial de la Gastronomía Mexicana, 2023"
                    />
                  )}
                  {person && (
                    <>
                      {text("Fecha de verificación", "verifiedAt", {
                        type: "date",
                      })}
                      {text("Persona que verifica", "verifiedBy")}
                    </>
                  )}
                  {person && data.verificationNote && (
                    <p className="foot-note wide">
                      Referencia del mockup: {data.verificationNote}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="demo-step-footer">
              {tabs.findIndex((x) => x[0] === tab) > 0 && (
                <button
                  type="button"
                  className="g-btn"
                  onClick={() =>
                    setTab(tabs[tabs.findIndex((x) => x[0] === tab) - 1][0])
                  }
                >
                  ← Anterior
                </button>
              )}
              {tab !== "respaldo" ? (
                <button
                  className="g-btn p"
                  type="button"
                  onClick={() =>
                    setTab(tabs[tabs.findIndex((x) => x[0] === tab) + 1][0])
                  }
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  className="g-btn p"
                  disabled={busy || reading}
                  type="submit"
                >
                  Guardar registro
                </button>
              )}
            </div>
          </section>
        </div>
      </form>
      {term && (
        <dialog
          className="g-card demo-modal"
          ref={(node) => {
            if (node && !node.open) node.showModal();
          }}
          onCancel={() => setTerm(null)}
          aria-label={`Agregar ${term.resource === "ingredientes" ? "ingrediente o producto" : term.resource === "colectivos" ? "colectivo" : "establecimiento"}`}
        >
          <h2>
            Agregar{" "}
            {term.resource === "ingredientes"
              ? "ingrediente o producto"
              : term.resource === "colectivos"
                ? "colectivo"
                : "establecimiento"}
          </h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const record = await saveDemoRecord(term.resource, {
                  n: term.n,
                  d: term.d || "",
                });
                const all = await demoSnapshot();
                setCatalogs(all);
                update(
                  term.field,
                  Array.isArray(data[term.field])
                    ? [...new Set([...data[term.field], record.id])]
                    : record.id,
                );
                setTerm(null);
                setError("");
              } catch (e) {
                setTerm((old) => ({ ...old, error: e.message }));
              }
            }}
          >
            <TextField
              label="Nombre"
              autoFocus
              required
              value={term.n}
              onChange={(n) => setTerm((old) => ({ ...old, n }))}
            />
            {term.resource === "ingredientes" && (
              <TextField
                label="Descripción"
                value={term.d}
                onChange={(d) => setTerm((old) => ({ ...old, d }))}
              />
            )}
            <p className="foot-note">
              Se añadirá a la lista para poder seleccionarlo en otros registros.
            </p>
            {term.error && (
              <p className="editor-error" role="alert">
                {term.error}
              </p>
            )}
            <div className="editor-actions">
              <button
                className="g-btn"
                type="button"
                onClick={() => setTerm(null)}
              >
                Cancelar
              </button>
              <button className="g-btn p" type="submit">
                Agregar y seleccionar
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
