import { useState } from "react";
import { uploadPersonFile } from "../../services/editorApi.js";
import { Field } from "./PersonFields.jsx";
export default function PersonUploader({
  id,
  evidence = false,
  onUploaded,
  onBusyChange = () => {},
}) {
  const [kind, setKind] = useState(evidence ? "consentimiento" : "foto"),
    [file, setFile] = useState(null),
    [epoch, setEpoch] = useState(0),
    [meta, setMeta] = useState({
      title: "",
      description: "",
      credit: "",
      license: "",
      alt: "",
      date: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (key, value) => setMeta((m) => ({ ...m, [key]: value }));
  async function upload() {
    if (!file) return setError("Selecciona un archivo.");
    if (file.size > (kind === "audio" ? 50 : 10) * 1024 * 1024)
      return setError(
        kind === "audio"
          ? "El audio no debe superar 50 MB."
          : "El archivo no debe superar 10 MB.",
      );
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      const uploaded = await uploadPersonFile(id, file, { ...meta, kind });
      await onUploaded(uploaded);
      setFile(null);
      setEpoch((n) => n + 1);
      setMeta({
        title: "",
        description: "",
        credit: "",
        license: "",
        alt: "",
        date: "",
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  if (!id)
    return (
      <p className="foot-note">
        Guarda primero el borrador con su nombre, tipo y municipio para añadir
        archivos.
      </p>
    );
  return (
    <section className="editor-upload">
      <h4>
        {evidence
          ? "Evidencia privada de autorización"
          : "Añadir fotografía o historia oral"}
      </h4>
      <fieldset disabled={busy} className="editor-form-grid">
        {!evidence && (
          <Field label="Tipo de archivo">
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setFile(null);
              }}
            >
              <option value="foto">Fotografía</option>
              <option value="audio">Historia oral — audio</option>
            </select>
          </Field>
        )}
        <Field
          label={evidence ? "Documento de consentimiento" : "Archivo"}
          hint={
            evidence
              ? "PDF, JPG, PNG o WEBP, hasta 10 MB. Solo será accesible al equipo autorizado."
              : kind === "audio"
                ? "MP3, M4A o WAV, hasta 50 MB."
                : "JPG, PNG o WEBP, hasta 10 MB."
          }
        >
          <input
            type="file"
            key={kind + epoch}
            accept={
              evidence
                ? ".pdf,.png,.jpg,.jpeg,.webp"
                : kind === "audio"
                  ? ".mp3,.m4a,.wav"
                  : ".png,.jpg,.jpeg,.webp"
            }
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            aria-label={
              evidence ? "Documento de consentimiento" : "Archivo multimedia"
            }
          />
        </Field>
        {file && <p className="foot-note">Seleccionado: {file.name}</p>}
        {!evidence && (
          <>
            <Field
              label="Título"
              value={meta.title}
              onChange={(e) => change("title", e.target.value)}
              maxLength={250}
            />
            <Field
              label="Crédito / autoría"
              value={meta.credit}
              onChange={(e) => change("credit", e.target.value)}
              maxLength={250}
            />
            <Field
              label="Licencia o permiso de uso"
              value={meta.license}
              onChange={(e) => change("license", e.target.value)}
              maxLength={250}
            />
            <Field
              label="Fecha del registro"
              type="date"
              value={meta.date}
              onChange={(e) => change("date", e.target.value)}
            />
            {kind === "foto" && (
              <Field
                label="Texto alternativo de la fotografía"
                value={meta.alt}
                onChange={(e) => change("alt", e.target.value)}
                maxLength={500}
              />
            )}
            <Field label="Descripción">
              <textarea
                value={meta.description}
                onChange={(e) => change("description", e.target.value)}
                rows={3}
                maxLength={1500}
              />
            </Field>
          </>
        )}
      </fieldset>
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="g-btn"
        type="button"
        disabled={busy || !file}
        onClick={upload}
      >
        {busy ? "Guardando archivo…" : "Guardar archivo"}
      </button>
    </section>
  );
}
