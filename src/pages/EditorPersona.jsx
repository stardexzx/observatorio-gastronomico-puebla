import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  editorOptions,
  editorPerson,
  createPerson,
  savePerson,
  personAction,
  editorialStatus,
} from "../services/editorApi.js";
import { useEditor } from "../components/editor/EditorSession.jsx";
import {
  blankPerson,
  Field,
  TagField,
  RelatedFields,
} from "../components/editor/PersonFields.jsx";
import PersonUploader from "../components/editor/PersonUploader.jsx";
import TerritoryPicker from "../components/editor/TerritoryPicker.jsx";
import useRemoteData from "./useRemoteData.js";
const tabs = [
  ["general", "General"],
  ["territorio", "Territorio"],
  ["trayectoria", "Trayectoria y saberes"],
  ["relaciones", "Recetas y vínculos"],
  ["fuentes", "Fuentes y consentimiento"],
  ["multimedia", "Fotografías e historia oral"],
];
export default function EditorPersona() {
  const { id } = useParams();
  return <PersonEditor key={id || "nueva"} id={id} />;
}
function PersonEditor({ id }) {
  const navigate = useNavigate(),
    session = useEditor(),
    options = useRemoteData(editorOptions, []);
  const [record, setRecord] = useState(null),
    [data, setData] = useState(blankPerson),
    [tab, setTab] = useState("general"),
    [loaded, setLoaded] = useState(!id),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [relationQuery, setRelationQuery] = useState(""),
    [relationOptions, setRelationOptions] = useState(null),
    [notes, setNotes] = useState("");
  useEffect(() => {
    let live = true;
    if (id)
      editorPerson(id)
        .then((r) => {
          if (live) {
            setRecord(r);
            setData({
              ...blankPerson(),
              ...r.data,
              source: { ...blankPerson().source, ...r.data.source },
              consent: { ...blankPerson().consent, ...r.data.consent },
            });
            setLoaded(true);
          }
        })
        .catch((e) => {
          if (live) {
            setError(e.message);
            setLoaded(true);
          }
        });
    return () => {
      live = false;
    };
  }, [id]);
  useEffect(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const change = (key, value) => {
    setData((d) => ({ ...d, [key]: value }));
    setDirty(true);
    setMessage("");
  };
  const nested = (group, key, value) => {
    setData((d) => ({ ...d, [group]: { ...d[group], [key]: value } }));
    setDirty(true);
    setMessage("");
  };
  const setResult = (r) => {
    setRecord(r);
    setData({ ...blankPerson(), ...r.data });
    setDirty(false);
  };
  async function save(current = data) {
    const result = id
      ? await savePerson(id, current, record.version)
      : await createPerson(current);
    setResult(result);
    if (!id) navigate(`/admin/cocineras/${result.id}`, { replace: true });
    return result;
  }
  async function perform(action, body = {}) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let current = record;
      if (dirty || !record) current = await save();
      const result = await personAction(current.id, action, body);
      setResult(result);
      setMessage(
        {
          enviar: "Ficha enviada a revisión.",
          revisar:
            body.verdict === "correcciones"
              ? "Se solicitaron correcciones."
              : "Revisión validada.",
          publicar: "Ficha publicada en el directorio y el mapa.",
          "verificar-consentimiento": "Consentimiento verificado.",
          "revocar-consentimiento":
            "Consentimiento revocado. La ficha deja de ser pública.",
          retirar: "Publicación retirada.",
        }[action],
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function uploaded(file) {
    const current = {
      ...data,
      ...(file.clase === "consentimiento"
        ? { consent: { ...data.consent, evidenceId: file.id } }
        : { mediaIds: [...data.mediaIds, file.id] }),
    };
    const result = await savePerson(id, current, record.version);
    setResult(result);
    setMessage(
      file.clase === "consentimiento"
        ? "Evidencia privada guardada."
        : "Archivo guardado y vinculado al borrador.",
    );
  }
  const progress = {
    general: !!(data.name && data.role && (data.biography || data.trajectory)),
    territorio: !!(data.municipalityCode && data.community),
    trayectoria: !!(
      data.yearsExperience !== "" &&
      data.yearsExperience !== null &&
      data.specialties.some(Boolean)
    ),
    relaciones: !!(data.recipeIds.length || data.marketIds.length),
    fuentes: !!(data.source.reference && record?.consent?.vigente),
    multimedia: !!data.mediaIds.length,
  };
  const related = relationOptions || options.data;
  if (!loaded || options.loading)
    return <div className="loading-state">Cargando ficha y catálogos…</div>;
  if (options.error)
    return (
      <div className="empty-state" role="alert">
        <p>{options.error.message}</p>
        <button className="g-btn" onClick={options.retry}>
          Reintentar
        </button>
      </div>
    );
  if (id && !record)
    return (
      <div className="empty-state" role="alert">
        <p>{error || "No se encontró la ficha."}</p>
        <Link to="/admin">Volver a captura</Link>
      </div>
    );
  return (
    <>
      <Link
        className="detail-back"
        to="/admin"
        onClick={(e) => {
          if (
            dirty &&
            !window.confirm(
              "Hay cambios sin guardar. ¿Quieres salir de la ficha?",
            )
          )
            e.preventDefault();
        }}
      >
        ← Volver a captura
      </Link>
      <div className="editor-heading">
        <div className="g-h">
          <h1>{data.name || "Nueva cocinera o cocinero"}</h1>
          <p>
            Documenta el registro sin omitir los elementos de su ficha pública.
          </p>
        </div>
        <span className="g-tag blue">
          {editorialStatus[record?.status] || "Nuevo borrador"}
        </span>
      </div>
      <div className="editor-actions">
        <button
          className="g-btn p"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await save();
              setMessage("Borrador guardado en el Observatorio.");
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Procesando…" : "Guardar borrador"}
        </button>
        <button
          className="g-btn"
          disabled={busy || !record}
          onClick={() => perform("enviar")}
        >
          Enviar a revisión
        </button>
        {record?.publishedRevisionId && (
          <Link className="g-btn" to={`/cocineras/${id}`}>
            Ver ficha pública
          </Link>
        )}
        <span className="g-sm" aria-live="polite">
          {dirty ? "Cambios sin guardar" : record ? "Cambios guardados" : ""}
        </span>
      </div>
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="editor-success" role="status">
          {message}
        </p>
      )}
      <div className="editor-layout">
        <nav className="editor-tabs" aria-label="Secciones del registro">
          {tabs.map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={tab === key ? "on" : ""}
              aria-current={tab === key ? "step" : undefined}
              onClick={() => setTab(key)}
            >
              <span className={progress[key] ? "complete" : ""}>
                {progress[key] ? "✓" : "○"}
              </span>
              {label}
            </button>
          ))}
          <p className="foot-note">
            Puedes guardar borradores incompletos. Para enviar se necesitan los
            datos generales, territorio, trayectoria, fuente y consentimiento
            vigente.
          </p>
        </nav>
        <section className="g-card editor-section">
          <h2>{tabs.find((t) => t[0] === tab)[1]}</h2>
          <fieldset disabled={busy} className="editor-form-grid">
            {tab === "general" && (
              <>
                <Field
                  label="Nombre público"
                  value={data.name}
                  maxLength={160}
                  onChange={(e) => change("name", e.target.value)}
                />
                <Field label="Tipo de registro">
                  <select
                    value={data.role}
                    onChange={(e) => change("role", e.target.value)}
                  >
                    {options.data.roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Semblanza" wide>
                  <textarea
                    rows={6}
                    value={data.biography}
                    onChange={(e) => change("biography", e.target.value)}
                    maxLength={12000}
                  />
                </Field>
                <Field label="Trayectoria" wide>
                  <textarea
                    rows={4}
                    value={data.trajectory}
                    onChange={(e) => change("trajectory", e.target.value)}
                    maxLength={12000}
                  />
                </Field>
                <Field
                  label="Frase o testimonio público"
                  wide
                  hint="Incluye una frase autorizada que pueda mostrarse en la ficha."
                >
                  <textarea
                    rows={3}
                    value={data.quote}
                    onChange={(e) => change("quote", e.target.value)}
                    maxLength={1000}
                  />
                </Field>
                <Field
                  label="Colectivo u organización"
                  value={data.collective}
                  maxLength={250}
                  onChange={(e) => change("collective", e.target.value)}
                />
              </>
            )}
            {tab === "territorio" && (
              <>
                <Field label="Municipio">
                  <select
                    value={data.municipalityCode}
                    onChange={(e) => change("municipalityCode", e.target.value)}
                  >
                    <option value="">Selecciona un municipio</option>
                    {options.data.municipalities.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Comunidad o localidad"
                  value={data.community}
                  onChange={(e) => change("community", e.target.value)}
                  maxLength={250}
                />
                <Field
                  label="Región documentada"
                  value={data.region}
                  onChange={(e) => change("region", e.target.value)}
                  maxLength={100}
                  hint="Registra la región según la fuente; no se deduce automáticamente."
                />
                <TagField
                  label="Lenguas"
                  value={data.languages}
                  onChange={(value) => change("languages", value)}
                />
                <TerritoryPicker
                  value={data.municipalityCode}
                  onChange={(code) => change("municipalityCode", code)}
                />
              </>
            )}
            {tab === "trayectoria" && (
              <>
                <Field
                  label="Años de experiencia"
                  type="number"
                  min="0"
                  max="120"
                  step="0.5"
                  value={data.yearsExperience ?? ""}
                  onChange={(e) => change("yearsExperience", e.target.value)}
                />
                <Field
                  label="Fecha de referencia de la experiencia"
                  type="date"
                  value={data.experienceDate || ""}
                  onChange={(e) => change("experienceDate", e.target.value)}
                />
                <TagField
                  label="Saberes y especialidades"
                  value={data.specialties}
                  onChange={(value) => change("specialties", value)}
                />
                <Field label="Reconocimientos o participación comunitaria" wide>
                  <textarea
                    rows={4}
                    value={data.recognitions}
                    onChange={(e) => change("recognitions", e.target.value)}
                    maxLength={3000}
                  />
                </Field>
                <Field
                  label="Linaje culinario"
                  wide
                  hint="Una persona, generación o transmisión documentada por línea."
                >
                  <textarea
                    rows={4}
                    value={data.lineage.join("\n")}
                    onChange={(e) =>
                      change("lineage", e.target.value.split("\n"))
                    }
                    maxLength={6000}
                  />
                </Field>
                <Field
                  label="Establecimiento vinculado"
                  value={data.establishment}
                  maxLength={300}
                  onChange={(e) => change("establishment", e.target.value)}
                />
                <Field
                  label="Estudiantes documentados"
                  type="number"
                  min="0"
                  step="1"
                  max="100000"
                  value={data.students ?? ""}
                  onChange={(e) => change("students", e.target.value)}
                  hint="Déjalo vacío si la fuente no documenta esta cifra."
                />
              </>
            )}
            {tab === "relaciones" && (
              <div className="wide">
                <p className="g-p">
                  Vincula fichas publicadas. Los conteos y enlaces de la ficha
                  pública se calculan con estas relaciones.
                </p>
                <div className="g-filters catalog-filters">
                  <label className="g-input">
                    <input
                      value={relationQuery}
                      onChange={(e) => setRelationQuery(e.target.value)}
                      aria-label="Buscar recetas o mercados relacionados"
                      maxLength={200}
                      placeholder="Buscar recetas o mercados…"
                    />
                  </label>
                  <button
                    className="g-btn"
                    type="button"
                    onClick={async () => {
                      try {
                        setRelationOptions(await editorOptions(relationQuery));
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    Buscar relaciones
                  </button>
                </div>
                <RelatedFields
                  title="Recetas insignia"
                  options={related.recipes}
                  selected={data.recipeIds}
                  onChange={(ids) => change("recipeIds", ids)}
                />
                <RelatedFields
                  title="Mercados vinculados"
                  options={related.markets}
                  selected={data.marketIds}
                  onChange={(ids) => change("marketIds", ids)}
                />
              </div>
            )}
            {tab === "fuentes" && (
              <>
                <Field label="Tipo de fuente">
                  <select
                    value={data.source.type}
                    onChange={(e) => nested("source", "type", e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    {options.data.sources.map((s) => (
                      <option value={s.code} key={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Fecha de consulta"
                  type="date"
                  value={data.source.consultationDate || ""}
                  onChange={(e) =>
                    nested("source", "consultationDate", e.target.value)
                  }
                />
                <Field
                  label="Referencia / cita pública"
                  wide
                  hint="Este texto se mostrará como respaldo de la ficha. No incluyas contactos ni datos privados."
                >
                  <textarea
                    value={data.source.reference}
                    onChange={(e) =>
                      nested("source", "reference", e.target.value)
                    }
                    rows={4}
                    maxLength={4000}
                  />
                </Field>
                <div className="wide consent-block">
                  <h3>Consentimiento para publicación</h3>
                  <p className="g-p">
                    La autorización necesita alcance, vigencia y evidencia
                    privada verificada antes de publicar.
                  </p>
                  <label className="editor-check">
                    <input
                      type="checkbox"
                      checked={data.consent.requested}
                      onChange={(e) =>
                        nested("consent", "requested", e.target.checked)
                      }
                    />
                    <span>
                      La persona o representación autoriza solicitar la
                      publicación de esta ficha y los materiales seleccionados.
                    </span>
                  </label>
                  <div className="editor-form-grid">
                    <Field
                      label="Persona que autoriza"
                      value={data.consent.authorizer}
                      onChange={(e) =>
                        nested("consent", "authorizer", e.target.value)
                      }
                      maxLength={250}
                    />
                    <Field
                      label="Calidad o representación"
                      value={data.consent.capacity}
                      onChange={(e) =>
                        nested("consent", "capacity", e.target.value)
                      }
                      maxLength={250}
                    />
                    <Field
                      label="Fecha de autorización"
                      type="date"
                      value={data.consent.date || ""}
                      onChange={(e) =>
                        nested("consent", "date", e.target.value)
                      }
                    />
                    <Field
                      label="Vencimiento (si aplica)"
                      type="date"
                      min={data.consent.date || undefined}
                      value={data.consent.expires || ""}
                      onChange={(e) =>
                        nested("consent", "expires", e.target.value)
                      }
                    />
                    <Field label="Alcance de la autorización">
                      <textarea
                        value={data.consent.scope}
                        onChange={(e) =>
                          nested("consent", "scope", e.target.value)
                        }
                        maxLength={3000}
                        rows={3}
                      />
                    </Field>
                    <Field label="Usos permitidos">
                      <textarea
                        value={data.consent.allowedUse}
                        onChange={(e) =>
                          nested("consent", "allowedUse", e.target.value)
                        }
                        maxLength={3000}
                        rows={3}
                      />
                    </Field>
                  </div>
                  <PersonUploader
                    id={id}
                    evidence
                    onUploaded={uploaded}
                    onBusyChange={setBusy}
                  />
                  <Field label="Evidencia privada seleccionada">
                    <select
                      value={data.consent.evidenceId}
                      onChange={(e) =>
                        nested("consent", "evidenceId", e.target.value)
                      }
                    >
                      <option value="">Sin evidencia</option>
                      {record?.files
                        .filter((f) => f.clase === "consentimiento")
                        .map((f) => (
                          <option value={f.id} key={f.id}>
                            {f.nombre}
                          </option>
                        ))}
                    </select>
                  </Field>
                  {data.consent.evidenceId && (
                    <a
                      className="g-link"
                      href={`/api/editor/archivos/${data.consent.evidenceId}`}
                    >
                      Descargar evidencia privada
                    </a>
                  )}
                  <p className="g-sm">
                    Estado:{" "}
                    {record?.consent?.vigente
                      ? "Verificado y vigente"
                      : record?.consent?.estado || "Pendiente de documentación"}
                  </p>
                  {session.user.permissions.consentimiento && (
                    <div className="g-filters">
                      <button
                        className="g-btn"
                        type="button"
                        disabled={!id}
                        onClick={() => perform("verificar-consentimiento")}
                      >
                        Verificar consentimiento
                      </button>
                      {record?.consent?.vigente && (
                        <button
                          className="g-btn"
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Al revocar el consentimiento la ficha y sus archivos dejan de ser públicos. ¿Continuar?",
                              )
                            )
                              perform("revocar-consentimiento");
                          }}
                        >
                          Revocar consentimiento
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
            {tab === "multimedia" && (
              <div className="wide">
                <PersonUploader
                  id={id}
                  onUploaded={uploaded}
                  onBusyChange={setBusy}
                />
                <h3>Materiales de esta ficha</h3>
                {record?.files
                  .filter((f) => f.clase !== "consentimiento")
                  .map((f) => (
                    <label className="editor-file editor-check" key={f.id}>
                      <input
                        type="checkbox"
                        checked={data.mediaIds.includes(f.id)}
                        onChange={(e) =>
                          change(
                            "mediaIds",
                            e.target.checked
                              ? [...data.mediaIds, f.id]
                              : data.mediaIds.filter((id) => id !== f.id),
                          )
                        }
                      />
                      <span>
                        <b>{f.metadatos.title || f.nombre}</b>
                        <small>
                          {f.clase === "audio" ? "Historia oral" : "Fotografía"}{" "}
                          · {f.metadatos.credit} · {f.metadatos.license}
                        </small>
                      </span>
                    </label>
                  ))}
                {!record?.files.some((f) => f.clase !== "consentimiento") && (
                  <p className="foot-note">
                    Aún no hay fotografías ni registros de historia oral.
                  </p>
                )}
                <p className="foot-note">
                  Solo los materiales seleccionados se incluirán en la siguiente
                  revisión. Los documentos de consentimiento nunca forman parte
                  de esta lista pública.
                </p>
              </div>
            )}
          </fieldset>
        </section>
      </div>
      {record?.revisionId && (
        <section className="g-card editorial-review">
          <h3>Revisión y publicación</h3>
          <p className="g-p">
            El borrador no modifica la versión pública. Guarda y envía los
            cambios antes de emitir un dictamen o publicar.
          </p>
          <Field label="Observaciones de revisión o motivo de retiro">
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={4000}
            />
          </Field>
          <div className="g-filters">
            {session.user.permissions.validar && (
              <>
                <button
                  className="g-btn"
                  disabled={busy || dirty || record.status !== "en_revision"}
                  onClick={() =>
                    perform("revisar", { verdict: "validado", notes })
                  }
                >
                  Validar revisión
                </button>
                <button
                  className="g-btn"
                  disabled={busy || dirty || record.status !== "en_revision"}
                  onClick={() =>
                    perform("revisar", { verdict: "correcciones", notes })
                  }
                >
                  Solicitar correcciones
                </button>
              </>
            )}
            {session.user.permissions.publicar && (
              <button
                className="g-btn p"
                disabled={busy || dirty || record.status !== "validado"}
                onClick={() => perform("publicar")}
              >
                Publicar ficha
              </button>
            )}
            {session.user.permissions.retirar && record.publishedRevisionId && (
              <button
                className="g-btn"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "¿Retirar la versión publicada de esta ficha?",
                    )
                  )
                    perform("retirar", { notes });
                }}
              >
                Retirar publicación
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
