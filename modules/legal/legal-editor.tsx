"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createBlankLegalInput, legalInputFromRecord, legalClassificationOptions,
  legalThemeOptions, legalJurisdictionLabels, legalSituationLabels,
  legalDossierLabels, legalLinkLabels, legalLinkKey, legalSpecificFields,
  LEGAL_MAX_DOCUMENTS, LEGAL_MAX_PDF_BYTES,
  type LegalInput, type LegalRecord, type LegalSource, type LegalOption,
  type LegalLinkKind, type LegalDossierState, type LegalVisibility,
} from "@/data/legal";
import { LegalIcon } from "./legal-ui";
import { LegalWorkflowControls } from "./legal-workflow-controls";
import { LegalRecordView } from "./legal-record-view";
import "./legal-editor.css";

type PendingDocument = {
  id: string; file: File; visibility: LegalVisibility;
  license: string; sourceId: string; publicPermission: boolean;
};
type FieldErrors = Record<string, string>;
type RequestFailure = Error & { fields?: FieldErrors };
type TextField = Exclude<keyof LegalInput, "classification" | "thematicAxes" | "jurisdiction" | "situation" | "specificFields" | "sources" | "links" | "documentIds" | "dossier">;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const error = new Error(typeof body?.error === "string" ? body.error : typeof body?.message === "string" ? body.message : "No se pudo completar la operación (" + response.status + ").") as RequestFailure;
    const supplied = body?.fields ?? body?.fieldErrors;
    if (supplied && typeof supplied === "object") {
      error.fields = Object.fromEntries(Object.entries(supplied).map(([key, value]) => [key, Array.isArray(value) ? value.join(" ") : String(value)]));
    }
    if (Array.isArray(body?.issues)) {
      const mapped: FieldErrors = { ...error.fields };
      for (const entry of body.issues) {
        if (!entry || typeof entry !== "object") continue;
        const issue = entry as Record<string, unknown>;
        const path = Array.isArray(issue.path) ? issue.path.map(String).join(".") : typeof issue.path === "string" ? issue.path : "";
        if (path && typeof issue.message === "string") mapped[path] = mapped[path] ? mapped[path] + " " + issue.message : issue.message;
      }
      if (Object.keys(mapped).length) error.fields = mapped;
    }
    throw error;
  }
  if (!body) throw new Error("El servidor no devolvió una respuesta válida.");
  return body as T;
}
function blankSource(): LegalSource {
  return { id: crypto.randomUUID(), title: "", reference: "", authority: "", url: "", publicationDate: "", consultedAt: "", publicCitation: "", claim: "", section: "", visibility: "restringido" };
}
function safeUrl(value: string): boolean {
  if (!value.trim()) return true;
  try { const protocol = new URL(value).protocol; return protocol === "https:"; } catch { return false; }
}
function downloadUrl(value: string): string | undefined {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return safeUrl(value) && value.trim() ? value : undefined;
}

export function LegalEditor({ record, canCreate = false }: { record?: LegalRecord; canCreate?: boolean }) {
  const router = useRouter();
  const [current, setCurrent] = useState<LegalRecord | undefined>(record);
  const [input, setInput] = useState<LegalInput>(() => record ? legalInputFromRecord(record) : createBlankLegalInput());
  const [baseline, setBaseline] = useState(() => JSON.stringify(record ? legalInputFromRecord(record) : createBlankLegalInput()));
  const [options, setOptions] = useState<LegalOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [linkKind, setLinkKind] = useState<LegalLinkKind>("recipes");
  const [linkSearch, setLinkSearch] = useState("");
  const [optionKey, setOptionKey] = useState("");
  const [pending, setPending] = useState<PendingDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(input) !== baseline || pending.length > 0;
  const guarded = useRef(false);
  const editable = current ? current.capabilities.edit : canCreate;

  useLayoutEffect(() => { guarded.current = dirty || busy; }, [dirty, busy]);
  useEffect(() => {
    const controller = new AbortController();
    request<{ options: LegalOption[] }>("/api/legal/options", { signal: controller.signal })
      .then(result => { setOptions(result.options); setOptionsError(""); })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setOptionsError(reason instanceof Error ? reason.message : "No se pudieron cargar los vínculos."); })
      .finally(() => { if (!controller.signal.aborted) setOptionsLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (guarded.current) { event.preventDefault(); event.returnValue = ""; }
    };
    const onLink = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || !guarded.current) return;
      if (busy || !window.confirm("Hay cambios o archivos pendientes. ¿Quieres salir sin guardarlos?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onLink, true); };
  }, [busy]);
  useEffect(() => { if (error || Object.keys(errors).length) alertRef.current?.focus(); }, [error, errors]);

  function update<K extends keyof LegalInput>(key: K, value: LegalInput[K]) {
    setInput(previous => ({ ...previous, [key]: value }));
    setMessage("");
    setErrors(previous => { const next = { ...previous }; for (const errorKey of Object.keys(next)) if (errorKey === key || errorKey.startsWith(String(key) + ".")) delete next[errorKey]; return next; });
  }
  function accept(next: LegalRecord) {
    const value = legalInputFromRecord(next);
    setCurrent(next); setInput(value); setBaseline(JSON.stringify(value));
  }
  function fail(reason: unknown) {
    const failure = reason as RequestFailure;
    setError(failure instanceof Error ? failure.message : "No se pudo completar la operación.");
    if (failure?.fields) setErrors(failure.fields);
  }
  function leave() {
    if (busy) return;
    if (dirty && !window.confirm("Hay cambios o archivos pendientes. ¿Quieres salir sin guardarlos?")) return;
    router.push(current ? "/proteccion-legal/" + encodeURIComponent(current.id) : "/proteccion-legal");
  }
  function validate(): FieldErrors {
    const found: FieldErrors = {};
    if (!input.name.trim()) found.name = "Escribe el nombre del instrumento para guardar el borrador.";
    const sourceIds = new Set(input.sources.map(source => source.id));
    input.sources.forEach((source, index) => {
      if (!source.title.trim()) found["sources." + index + ".title"] = "La fuente necesita un título.";
      if (![source.reference, source.url, source.publicCitation].some(value => value.trim())) found["sources." + index + ".reference"] = "Añade una referencia, URL o cita para identificar esta fuente.";
      if (!safeUrl(source.url)) found["sources." + index + ".url"] = "Usa una dirección HTTPS válida.";
    });
    const seen = new Set<string>();
    input.links.forEach((link, index) => {
      if (!link.scope.trim()) found["links." + index + ".scope"] = "Describe el alcance documentado de este vínculo.";
      if (!link.sourceId || !sourceIds.has(link.sourceId)) found["links." + index + ".sourceId"] = "Selecciona una fuente de esta ficha.";
      if (seen.has(legalLinkKey(link))) found.links = "Hay vínculos duplicados; conserva una relación por entidad.";
      seen.add(legalLinkKey(link));
    });
    if (input.dossier && !input.dossier.title.trim()) found["dossier.title"] = "Identifica el expediente real o desactiva esta sección.";
    if (current && current.documents.length + pending.length > LEGAL_MAX_DOCUMENTS) found.documents = "Se admiten hasta " + LEGAL_MAX_DOCUMENTS + " PDF por ficha.";
    pending.forEach((document, index) => {
      if (document.visibility === "publico" && (!document.license.trim() || !document.publicPermission)) found["pending." + index] = "Para un PDF público indica su licencia y confirma que puedes autorizar su difusión.";
      if (document.sourceId && !sourceIds.has(document.sourceId)) found["pending." + index] = "Selecciona una fuente existente para el archivo.";
    });
    return found;
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !editable) return;
    setError(""); setMessage("");
    const found = validate(); setErrors(found);
    if (Object.keys(found).length) { setError("Revisa los campos señalados antes de guardar."); return; }
    setBusy(true);
    let saved: LegalRecord | undefined;
    try {
      const result = await request<{ record: LegalRecord }>(current ? "/api/legal/" + encodeURIComponent(current.id) : "/api/legal", {
        method: current ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      const recordId = result.record.id;
      const sourceIds = result.record.sourceIdChanges ?? {};
      setPending(previous => previous.map(document => ({ ...document, sourceId: sourceIds[document.sourceId] ?? document.sourceId })));
      saved = result.record; accept(result.record);
      for (const document of pending) {
        const form = new FormData();
        form.set("file", document.file); form.set("visibility", document.visibility); form.set("license", document.license);
        if (document.sourceId) form.set("sourceId", sourceIds[document.sourceId] ?? document.sourceId);
        const uploaded: { record: LegalRecord } = await request<{ record: LegalRecord }>("/api/legal/" + encodeURIComponent(recordId) + "/documents", { method: "POST", body: form });
        saved = uploaded.record; accept(uploaded.record);
        setPending(previous => previous.filter(item => item.id !== document.id));
      }
      setMessage("Ficha guardada. Estado y permisos actualizados por el servidor.");
      if (!record) router.replace("/proteccion-legal/" + encodeURIComponent(recordId) + "/editar");
    } catch (reason) {
      fail(reason);
      if (saved) setMessage("La ficha se guardó. Los archivos que siguen pendientes pueden volver a intentarse con Guardar.");
    } finally { setBusy(false); }
  }
  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const problems: string[] = [];
    const accepted: PendingDocument[] = [];
    const existing = (current?.documents.length ?? 0) + pending.length;
    files.forEach(file => {
      if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) problems.push(file.name + ": selecciona un archivo PDF.");
      else if (file.size > LEGAL_MAX_PDF_BYTES) problems.push(file.name + ": supera el límite de 20 MB.");
      else if (file.size === 0) problems.push(file.name + ": el archivo está vacío.");
      else if (existing + accepted.length >= LEGAL_MAX_DOCUMENTS) problems.push(file.name + ": se alcanzó el máximo de 12 PDF.");
      else accepted.push({ id: crypto.randomUUID(), file, visibility: "restringido", license: "", sourceId: "", publicPermission: false });
    });
    setPending(previous => [...previous, ...accepted]); setMessage("");
    if (problems.length) setError(problems.join(" "));
  }
  function changePending(id: string, patch: Partial<PendingDocument>) {
    setPending(previous => previous.map(item => item.id === id ? { ...item, ...patch } : item));
  }
  function updateSource(index: number, key: keyof LegalSource, value: string) {
    update("sources", input.sources.map((source, position) => position === index ? { ...source, [key]: value } : source));
  }
  function removeSource(id: string) {
    if (input.links.some(link => link.sourceId === id) || pending.some(document => document.sourceId === id) || current?.documents.some(document => document.sourceId === id)) {
      setError("Esta fuente sustenta vínculos o documentos. Actualiza sus referencias antes de retirarla."); return;
    }
    update("sources", input.sources.filter(source => source.id !== id));
  }
  function addLink() {
    const option = options.find(item => legalLinkKey(item) === optionKey && item.kind === linkKind);
    if (!option) return;
    if (input.links.some(link => legalLinkKey(link) === legalLinkKey(option))) { setError("Esta entidad ya está vinculada a la ficha."); return; }
    update("links", [...input.links, { ...option, scope: "", sourceId: "" }]);
    setOptionKey("");
  }
  async function detachDocument(id: string) {
    if (!current || busy || dirty) return;
    if (!window.confirm("¿Retirar este PDF de la versión en edición? La historia y las revisiones aprobadas se conservan.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await request<{ record: LegalRecord }>("/api/legal/" + encodeURIComponent(current.id) + "/documents/" + encodeURIComponent(id), { method: "DELETE" });
      accept(result.record); setMessage("Documento retirado de la versión en edición.");
    } catch (reason) { fail(reason); } finally { setBusy(false); }
  }
  function fieldError(key: string) {
    return errors[key] ? <span className="le-field-error" id={"le-error-" + key}>{errors[key]}</span> : null;
  }
  function textField(key: TextField, label: string, multiline = false, type = "text") {
    const invalid = Boolean(errors[key]);
    return <label className={"le-field" + (multiline ? " le-wide" : "")} key={key} htmlFor={"le-" + key}>
      <span>{label}{key === "name" && <span aria-hidden="true"> *</span>}</span>
      {multiline
        ? <textarea aria-label={label} id={"le-" + key} value={input[key]} onChange={event => update(key, event.target.value)} rows={3} aria-invalid={invalid} aria-describedby={invalid ? "le-error-" + key : undefined} />
        : <input aria-label={label} id={"le-" + key} type={type} value={input[key]} onChange={event => update(key, event.target.value)} required={key === "name"} aria-invalid={invalid} aria-describedby={invalid ? "le-error-" + key : undefined} />}
      {fieldError(key)}
    </label>;
  }
  const matchingOptions = options.filter(option => option.kind === linkKind && !input.links.some(link => legalLinkKey(link) === legalLinkKey(option)) && option.name.toLocaleLowerCase("es").includes(linkSearch.toLocaleLowerCase("es")));

  if (!editable) {
    if (!current) return <section className="g-card legal-editor"><h1>Edición no disponible</h1><p>Tu sesión no tiene permiso para editar esta ficha. Puedes consultar su información y las acciones que autorice el servidor.</p><button className="g-btn" type="button" onClick={leave}>Volver a la ficha</button></section>;
    return <div className="legal-editor" aria-busy={busy}>
      <header className="le-heading">
        <div><p className="le-eyebrow">Protección legal · Consulta</p><h1>{current.status === "en_revision" ? "Ficha en revisión" : "Consulta del instrumento legal"}</h1><p>{current.status === "en_revision" ? "La edición permanece en pausa hasta que la persona responsable concluya la revisión." : "Puedes consultar la ficha y realizar las acciones que autorice el servidor."}</p></div>
        <button className="g-btn" type="button" onClick={leave} disabled={busy}>Volver a la ficha</button>
      </header>
      <LegalRecordView record={current} />
      <LegalWorkflowControls record={current} onChange={accept} disabled={busy} />
    </div>;
  }

  return <div className="legal-editor" aria-busy={busy}>
    <header className="le-heading">
      <div><p className="le-eyebrow">Protección legal · Captura</p><h1>{current ? "Editar instrumento legal" : "Nuevo instrumento legal"}</h1><p>El borrador requiere nombre y clasificación. Completa los demás apartados conforme cuentes con evidencia.</p></div>
      <button type="button" className="g-btn" onClick={leave} disabled={busy}>Volver</button>
    </header>
    <div ref={alertRef} tabIndex={-1} className={error || Object.keys(errors).length ? "le-alert le-alert-error" : "le-alert-anchor"} role={error || Object.keys(errors).length ? "alert" : undefined}>
      {error && <p>{error}</p>}
      {Object.keys(errors).length > 0 && <ul>{Object.entries(errors).map(([key, value]) => <li key={key}><a href={"#" + (key.includes(".") ? "le-section-" + key.split(".")[0] : "le-" + key)}>{value}</a></li>)}</ul>}
    </div>
    {message && <p className="le-alert le-alert-success" role="status">{message}</p>}
    <form onSubmit={save} noValidate>
      <fieldset disabled={busy} className="le-form-fields">
        <section className="g-card le-section">
          <fieldset className="le-fieldset"><legend>Clasificación del instrumento <span aria-hidden="true">*</span></legend><p>Selecciona la figura documentada. La clasificación y los ejes temáticos se registran por separado.</p>
            <div className="le-classifications">{legalClassificationOptions.map(option => <label key={option.value} className={"le-classification" + (input.classification === option.value ? " is-selected" : "")} style={{ borderColor: input.classification === option.value ? option.color : undefined }}>
              <input type="radio" name="classification" value={option.value} checked={input.classification === option.value} onChange={() => {
                if (input.classification === option.value) return;
                setInput(previous => ({ ...previous, classification: option.value })); setMessage("");
              }} />
              <span className="le-class-icon" style={{ color: option.color, backgroundColor: option.color + "12" }}><LegalIcon name={option.icon} size={23} /></span>
              <span><strong>{option.label}</strong><small>{option.short}{input.classification === option.value ? " · Seleccionada" : ""}</small></span>
            </label>)}</div>
          </fieldset>
          <fieldset className="le-fieldset le-themes"><legend>Ejes temáticos</legend><div className="le-check-list">{legalThemeOptions.map(theme => <label key={theme.value}><input type="checkbox" checked={input.thematicAxes.includes(theme.value)} onChange={event => update("thematicAxes", event.target.checked ? [...input.thematicAxes, theme.value] : input.thematicAxes.filter(value => value !== theme.value))} /><span>{theme.label}</span></label>)}</div></fieldset>
        </section>
        <section className="g-card le-section"><h2>Identificación y vigencia</h2><div className="le-grid">
          {textField("name", "Nombre del instrumento")}
          <label className="le-field" htmlFor="le-jurisdiction"><span>Nivel o jurisdicción</span><select aria-label="Nivel o jurisdicción" id="le-jurisdiction" value={input.jurisdiction} onChange={event => update("jurisdiction", event.target.value as LegalInput["jurisdiction"])}>{Object.entries(legalJurisdictionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          {textField("authority", "Autoridad emisora")}{textField("officialReference", "Referencia oficial")}
          {textField("publicationDate", "Fecha de publicación", false, "date")}{textField("validFrom", "Inicio de vigencia", false, "date")}
          {textField("validUntil", "Fin de vigencia", false, "date")}{textField("reviewDate", "Fecha de revisión jurídica", false, "date")}
          <label className="le-field" htmlFor="le-situation"><span>Situación jurídica</span><select aria-label="Situación jurídica" id="le-situation" value={input.situation} onChange={event => update("situation", event.target.value as LegalInput["situation"])}>{Object.entries(legalSituationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><small>La situación jurídica es independiente del estado editorial.</small></label>
          {textField("description", "Descripción y contexto", true)}
        </div></section>
        <section className="g-card le-section"><h2>Características de la clasificación</h2><div className="le-grid">{legalSpecificFields[input.classification].map(field => <label className={"le-field" + (field.multiline ? " le-wide" : "")} key={field.key} htmlFor={"le-specific-" + field.key}><span>{field.label}</span>{field.multiline ? <textarea id={"le-specific-" + field.key} rows={3} value={input.specificFields[field.key] ?? ""} onChange={event => update("specificFields", { ...input.specificFields, [field.key]: event.target.value })} /> : <input id={"le-specific-" + field.key} value={input.specificFields[field.key] ?? ""} onChange={event => update("specificFields", { ...input.specificFields, [field.key]: event.target.value })} />}{fieldError("specificFields." + field.key)}</label>)}</div></section>
        <section className="g-card le-section"><h2>Alcance y población beneficiaria</h2><div className="le-grid">{textField("scope", "Alcance documentado", true)}{textField("regulatedMatter", "Materia regulada", true)}{textField("beneficiaries", "Beneficiarios y sujetos de derechos", true)}{textField("territorialScope", "Alcance territorial", true)}</div></section>
        <section className="g-card le-section"><h2>Aplicación y salvaguardia</h2><div className="le-grid">{textField("responsibleAgency", "Dependencia responsable")}{textField("budget", "Presupuesto documentado")}{textField("operatingRules", "Reglas de operación", true)}{textField("safeguardingPlan", "Plan y medidas de salvaguardia", true)}</div></section>
        <section className="g-card le-section"><h2>Cumplimiento, efectividad y políticas públicas</h2><div className="le-grid">{textField("complianceIndicators", "Indicadores de cumplimiento", true)}{textField("effectiveness", "Efectividad documentada", true)}{textField("operationalChallenges", "Retos operativos", true)}{textField("legalGaps", "Vacíos y brechas legales", true)}{textField("linkedPolicies", "Políticas públicas vinculadas", true)}</div></section>
        <section className="g-card le-section" id="le-section-dossier"><h2>Expediente de trámite</h2>
          <label className="le-check"><input type="checkbox" checked={Boolean(input.dossier)} onChange={event => update("dossier", event.target.checked ? { title: "", folio: "", requestDate: "", state: "no_documentado" } : null)} /><span>Esta ficha se relaciona con un expediente real documentado</span></label>
          <p className="le-help">Activa esta sección únicamente cuando exista un trámite identificable. Una ficha puede guardarse sin expediente.</p>
          {input.dossier && <div className="le-grid">
            <label className="le-field" htmlFor="le-dossier-title"><span>Nombre del expediente</span><input id="le-dossier-title" value={input.dossier.title} onChange={event => update("dossier", { ...input.dossier!, title: event.target.value })} aria-invalid={Boolean(errors["dossier.title"])} />{fieldError("dossier.title")}</label>
            <label className="le-field" htmlFor="le-dossier-folio"><span>Folio</span><input id="le-dossier-folio" value={input.dossier.folio} onChange={event => update("dossier", { ...input.dossier!, folio: event.target.value })} /></label>
            <label className="le-field" htmlFor="le-dossier-date"><span>Fecha de solicitud</span><input id="le-dossier-date" type="date" value={input.dossier.requestDate} onChange={event => update("dossier", { ...input.dossier!, requestDate: event.target.value })} /></label>
            <label className="le-field" htmlFor="le-dossier-state"><span>Estado del trámite</span><select aria-label="Estado del trámite" id="le-dossier-state" value={input.dossier.state} onChange={event => update("dossier", { ...input.dossier!, state: event.target.value as LegalDossierState })}>{Object.entries(legalDossierLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          </div>}
        </section>
        <section className="g-card le-section" id="le-section-sources"><div className="le-section-heading"><div><h2>Fuentes y procedencia</h2><p>Cada fuente añadida necesita título y al menos una referencia, URL o cita. El resto puede completarse después.</p></div><button type="button" className="g-btn" onClick={() => update("sources", [...input.sources, blankSource()])}>Añadir fuente</button></div>
          {input.sources.length === 0 && <p className="le-empty">Todavía no se han añadido fuentes.</p>}
          {input.sources.map((source, index) => <article className="le-subcard" key={source.id}><div className="le-section-heading"><h3>Fuente {index + 1}</h3><button type="button" className="le-text-button" onClick={() => removeSource(source.id)}>Retirar fuente</button></div><div className="le-grid">
            {(["title", "reference", "authority", "url", "publicationDate", "consultedAt", "publicCitation", "claim", "section"] as const).map(key => {
              const labels = { title: "Título", reference: "Referencia documental", authority: "Autoría o institución", url: "URL de la fuente", publicationDate: "Fecha de publicación", consultedAt: "Fecha de consulta", publicCitation: "Cita pública", claim: "Afirmación sustentada", section: "Página, artículo o sección" };
              const multiline = key === "publicCitation" || key === "claim";
              const errorKey = "sources." + index + "." + key;
              return <label className={"le-field" + (multiline ? " le-wide" : "")} key={key} htmlFor={"le-source-" + source.id + "-" + key}><span>{labels[key]}</span>{multiline ? <textarea aria-label={labels[key]} id={"le-source-" + source.id + "-" + key} rows={2} value={source[key]} onChange={event => updateSource(index, key, event.target.value)} aria-invalid={Boolean(errors[errorKey])} /> : <input aria-label={labels[key]} id={"le-source-" + source.id + "-" + key} type={key === "url" ? "url" : key === "publicationDate" || key === "consultedAt" ? "date" : "text"} value={source[key]} onChange={event => updateSource(index, key, event.target.value)} aria-invalid={Boolean(errors[errorKey])} />}{fieldError(errorKey)}</label>;
            })}
            <label className="le-field" htmlFor={"le-source-" + source.id + "-visibility"}><span>Visibilidad de la fuente</span><select aria-label="Visibilidad de la fuente" id={"le-source-" + source.id + "-visibility"} value={source.visibility} onChange={event => updateSource(index, "visibility", event.target.value)}><option value="restringido">Restringida al equipo</option><option value="publico">Pública: referencia y URL visibles</option></select></label>
          </div></article>)}
        </section>
        <section className="g-card le-section" id="le-section-links"><h2>Vínculos con el acervo</h2><p>Selecciona registros existentes y documenta el alcance de cada relación. Vincular una receta no acredita por sí mismo protección de derechos.</p>
          {optionsError && <p className="le-alert le-alert-error" role="alert">{optionsError}</p>}
          <div className="le-link-picker">
            <label className="le-field" htmlFor="le-link-kind"><span>Catálogo</span><select aria-label="Catálogo" id="le-link-kind" value={linkKind} onChange={event => { setLinkKind(event.target.value as LegalLinkKind); setOptionKey(""); }}>{Object.entries(legalLinkLabels).map(([kind, label]) => <option key={kind} value={kind} disabled={kind === "establishments"}>{label}{kind === "establishments" ? " (no disponible)" : ""}</option>)}</select></label>
            {linkKind === "establishments" ? <p className="le-empty">No hay registros normalizados de establecimientos disponibles. No se crearán identidades a partir de texto libre.</p> : <>
              <label className="le-field" htmlFor="le-link-search"><span>Buscar nombre</span><input type="search" id="le-link-search" value={linkSearch} onChange={event => { setLinkSearch(event.target.value); setOptionKey(""); }} /></label>
              <label className="le-field" htmlFor="le-link-option"><span>Registro existente</span><select aria-label="Registro existente" id="le-link-option" value={optionKey} onChange={event => setOptionKey(event.target.value)} disabled={optionsLoading}><option value="">{optionsLoading ? "Cargando registros…" : "Selecciona un registro"}</option>{matchingOptions.map(option => <option value={legalLinkKey(option)} key={legalLinkKey(option)}>{option.name}{option.municipalityCode ? " · " + option.municipalityCode : ""} · {option.origin === "ogp" ? "Acervo" : "Panel"}</option>)}</select>{!optionsLoading && matchingOptions.length === 0 && <small>No hay coincidencias disponibles en este catálogo.</small>}</label>
              <button type="button" className="g-btn" onClick={addLink} disabled={!optionKey || optionsLoading}>Añadir vínculo</button>
            </>}
          </div>
          <p className="le-help">Establecimientos no está disponible: no existe un catálogo de registros normalizados para vincular.</p>
          {input.links.length === 0 && <p className="le-empty">No hay vínculos registrados.</p>}
          {input.links.map((link, index) => <article className="le-subcard" key={legalLinkKey(link)}><div className="le-section-heading"><div><h3>{link.name}</h3><p>{legalLinkLabels[link.kind]} · {link.origin === "ogp" ? "Acervo" : "Panel"}</p></div><button type="button" className="le-text-button" onClick={() => update("links", input.links.filter((_, position) => position !== index))}>Retirar vínculo</button></div><div className="le-grid">
            <label className="le-field" htmlFor={"le-link-scope-" + index}><span>Alcance documentado de la relación</span><textarea id={"le-link-scope-" + index} value={link.scope} rows={2} onChange={event => update("links", input.links.map((item, position) => position === index ? { ...item, scope: event.target.value } : item))} aria-invalid={Boolean(errors["links." + index + ".scope"])} />{fieldError("links." + index + ".scope")}</label>
            <label className="le-field" htmlFor={"le-link-source-" + index}><span>Fuente que sustenta el vínculo</span><select aria-label="Fuente que sustenta el vínculo" id={"le-link-source-" + index} value={link.sourceId} onChange={event => update("links", input.links.map((item, position) => position === index ? { ...item, sourceId: event.target.value } : item))} aria-invalid={Boolean(errors["links." + index + ".sourceId"])}><option value="">Selecciona una fuente</option>{input.sources.map((source, position) => <option key={source.id} value={source.id}>{source.title || "Fuente " + (position + 1)}</option>)}</select>{fieldError("links." + index + ".sourceId")}</label>
          </div></article>)}
        </section>
        <section className="g-card le-section" id="le-section-documents"><div className="le-section-heading"><div><h2>Documentos PDF</h2><p>Hasta 12 archivos de 20 MB cada uno. Se adjuntan después de guardar la ficha y requieren revisión editorial para su publicación.</p></div><button type="button" className="g-btn" onClick={() => fileInput.current?.click()} disabled={(current?.documents.length ?? 0) + pending.length >= LEGAL_MAX_DOCUMENTS}>Seleccionar PDF</button></div>
          <input className="le-file-input" ref={fileInput} type="file" multiple accept="application/pdf,.pdf" onChange={addFiles} aria-label="Seleccionar documentos PDF" />
          {fieldError("documents")}
          {current?.documents.map(document => {
            const href = downloadUrl(document.url);
            return <article key={document.id} className="le-document"><div><strong>{document.name}</strong><p>{document.visibility === "publico" ? "Visibilidad pública" : "Restringido al equipo"} · {document.size === null ? "Tamaño no informado" : (document.size / 1024 / 1024).toFixed(2) + " MB"}</p><small>Licencia: {document.license || "No registrada"}</small></div><div className="le-document-actions">{href && <a className="g-btn" href={href} target="_blank" rel="noopener noreferrer" download>Descargar</a>}<button type="button" className="le-text-button" onClick={() => detachDocument(document.id)} disabled={dirty}>Retirar de esta edición</button></div></article>;
          })}
          {dirty && Boolean(current?.documents.length) && <p className="le-help">Guarda los cambios y archivos pendientes antes de retirar documentos.</p>}
          {pending.map((document, index) => <article className="le-subcard le-pending" key={document.id}><div className="le-section-heading"><div><h3>{document.file.name}</h3><p>{(document.file.size / 1024 / 1024).toFixed(2)} MB · Pendiente de guardar</p></div><button type="button" className="le-text-button" onClick={() => setPending(previous => previous.filter(item => item.id !== document.id))}>Quitar pendiente</button></div><div className="le-grid">
            <label className="le-field" htmlFor={"le-pending-visibility-" + document.id}><span>Visibilidad del PDF</span><select aria-label="Visibilidad del PDF" id={"le-pending-visibility-" + document.id} value={document.visibility} onChange={event => changePending(document.id, { visibility: event.target.value as LegalVisibility, publicPermission: false })}><option value="restringido">Restringido al equipo</option><option value="publico">Público, sujeto a autorización editorial</option></select></label>
            <label className="le-field" htmlFor={"le-pending-license-" + document.id}><span>Licencia o autorización de uso{document.visibility === "publico" ? " *" : ""}</span><input aria-label="Licencia o autorización de uso" id={"le-pending-license-" + document.id} value={document.license} onChange={event => changePending(document.id, { license: event.target.value })} /></label>
            <label className="le-field" htmlFor={"le-pending-source-" + document.id}><span>Fuente del documento (opcional)</span><select aria-label="Fuente del documento (opcional)" id={"le-pending-source-" + document.id} value={document.sourceId} onChange={event => changePending(document.id, { sourceId: event.target.value })}><option value="">Sin fuente asociada</option>{input.sources.map((source, position) => <option key={source.id} value={source.id}>{source.title || "Fuente " + (position + 1)}</option>)}</select></label>
            {document.visibility === "publico" && <label className="le-check le-wide"><input type="checkbox" checked={document.publicPermission} onChange={event => changePending(document.id, { publicPermission: event.target.checked })} /><span>He verificado la licencia o autorización y puedo solicitar la difusión pública de este PDF.</span></label>}
          </div>{fieldError("pending." + index)}</article>)}
          {!current?.documents.length && pending.length === 0 && <p className="le-empty">No hay documentos adjuntos.</p>}
        </section>
        <section className="g-card le-section"><h2>Notas internas del equipo</h2><p>Estas notas se conservan para el equipo y no forman parte de la ficha pública.</p><div className="le-grid">{textField("privateNotes", "Notas internas", true)}</div></section>
      </fieldset>
      <footer className="le-savebar"><div><strong>{busy ? "Guardando…" : dirty ? "Cambios pendientes" : current ? "Cambios guardados" : "Nuevo borrador"}</strong><p>{current ? "El servidor comprobará los permisos y actualizará el estado de la ficha." : "La ficha se creará al pulsar Guardar; no se crean registros al seleccionar archivos."}</p></div><div><button type="button" className="g-btn" onClick={leave} disabled={busy}>Volver</button><button type="submit" className="g-btn primary" disabled={busy}>{busy ? "Guardando…" : "Guardar ficha"}</button></div></footer>
    </form>
    {current && <section className="g-card le-section le-workflow"><h2>Revisión y publicación</h2>{dirty && <p className="le-help">Guarda los cambios pendientes antes de solicitar una acción editorial.</p>}<LegalWorkflowControls record={current} onChange={next => { accept(next); setMessage(""); }} disabled={dirty || busy} /></section>}
  </div>;
}

export default LegalEditor;
