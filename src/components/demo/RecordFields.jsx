import { cloneElement, useId, useState } from "react";

export function Field({ label, help, children, wide = false }) {
  const id = useId();
  return (
    <label className={`editor-field ${wide ? "wide" : ""}`}>
      <span id={`${id}-label`}>{label}</span>
      {cloneElement(children, {
        "aria-labelledby": `${id}-label`,
        "aria-describedby": help ? `${id}-help` : undefined,
      })}
      {help && <small id={`${id}-help`}>{help}</small>}
    </label>
  );
}
export function TextField({
  label,
  value,
  onChange,
  help,
  multiline,
  ...props
}) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <Field label={label} help={help} wide={multiline}>
      <Tag
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={multiline ? 4 : undefined}
        maxLength={multiline ? 10000 : 500}
        {...props}
      />
    </Field>
  );
}
export function EntryList({
  label,
  values = [],
  onChange,
  placeholder = "Escribe un elemento",
  help,
}) {
  const [entry, setEntry] = useState("");
  const id = useId();
  const add = () => {
    const text = entry.trim();
    if (text && !values.includes(text)) onChange([...values, text]);
    setEntry("");
  };
  return (
    <div className="demo-entry-list wide">
      <label htmlFor={id}>{label}</label>
      {help && <p className="foot-note">{help}</p>}
      <div className="demo-inline">
        <input
          id={id}
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder={placeholder}
          maxLength={500}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          className="g-btn"
          type="button"
          onClick={add}
          disabled={!entry.trim()}
        >
          Añadir
        </button>
      </div>
      <div className="g-chips">
        {values.map((text, i) => (
          <span className="g-chip" key={`${text}-${i}`}>
            {text}
            <button
              type="button"
              className="demo-remove"
              aria-label={`Quitar ${text}`}
              onClick={() => onChange(values.filter((_, index) => index !== i))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
export function RelatedPicker({
  label,
  items,
  selected = [],
  onChange,
  onCreate,
  createLabel,
  single = false,
  exclude,
  help,
}) {
  const [query, setQuery] = useState("");
  const normalize = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = items.filter(
    (r) => r.id !== exclude && normalize(r.n).includes(normalize(query)),
  );
  return (
    <fieldset className="demo-related wide">
      <legend>{label}</legend>
      {help && <p className="foot-note">{help}</p>}
      <input
        className="demo-search"
        type="search"
        aria-label={`Buscar en ${label.toLowerCase()}`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre…"
        maxLength={200}
      />
      <div className="demo-options">
        {filtered.map((r) => (
          <label
            className={`demo-option ${selected.includes(r.id) ? "selected" : ""}`}
            key={r.id}
          >
            <input
              type="checkbox"
              checked={selected.includes(r.id)}
              onChange={(e) =>
                onChange(
                  single
                    ? e.target.checked
                      ? [r.id]
                      : []
                    : e.target.checked
                      ? [...selected, r.id]
                      : selected.filter((id) => id !== r.id),
                )
              }
            />
            <span>
              <b>{r.n}</b>
              {(r.m || r.p || r.d) && <small>{r.m || r.p || r.d}</small>}
            </span>
          </label>
        ))}
        {!filtered.length && (
          <p className="demo-empty">
            No se encontraron registros{query ? ` con «${query}»` : ""}.
          </p>
        )}
      </div>
      <div className="demo-picker-footer">
        <span>
          {selected.length} {single ? "seleccionado" : "seleccionados"}
        </span>
        {onCreate && (
          <button
            type="button"
            className="g-btn"
            onClick={() => onCreate(query)}
          >
            {createLabel || "Agregar registro"}
          </button>
        )}
      </div>
    </fieldset>
  );
}
export async function readLocalFile(file, type) {
  if (!file) return "";
  const limit = type === "audio" ? 25 : 8;
  const allowed =
    type === "audio"
      ? [
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/x-wav",
          "audio/mp4",
          "audio/ogg",
          "audio/webm",
          "audio/x-m4a",
        ]
      : ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type))
    throw new Error(
      type === "audio"
        ? "Selecciona un audio MP3, WAV, M4A, OGG o WEBM."
        : "Selecciona una imagen JPG, PNG o WEBP.",
    );
  if (file.size > limit * 1024 * 1024)
    throw new Error(`El archivo debe pesar como máximo ${limit} MB.`);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}
