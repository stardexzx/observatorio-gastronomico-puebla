import { cloneElement, useId } from "react";
export const blankPerson = () => ({
  name: "",
  role: "Cocinera tradicional",
  municipalityCode: "",
  community: "",
  region: "",
  biography: "",
  trajectory: "",
  quote: "",
  collective: "",
  establishment: "",
  recognitions: "",
  lineage: [],
  languages: [],
  specialties: [],
  yearsExperience: "",
  experienceDate: "",
  students: "",
  recipeIds: [],
  marketIds: [],
  mediaIds: [],
  source: { type: "entrevista", reference: "", consultationDate: "" },
  consent: {
    requested: false,
    authorizer: "",
    capacity: "",
    date: "",
    expires: "",
    scope: "",
    allowedUse: "",
    evidenceId: "",
  },
});
export function Field({ label, children, hint, wide, ...props }) {
  const id = useId(),
    help = hint ? `${id}-help` : undefined;
  return (
    <div className={`editor-field ${wide ? "wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children ? (
        cloneElement(children, { id, "aria-describedby": help })
      ) : (
        <input {...props} id={id} aria-describedby={help} />
      )}{" "}
      {hint && <small id={help}>{hint}</small>}
    </div>
  );
}
export function TagField({ label, value = [], onChange, hint }) {
  return (
    <Field label={label} hint={hint}>
      <input
        value={value.join("; ")}
        onChange={(e) =>
          onChange(e.target.value.split(";").map((s) => s.trimStart()))
        }
        onBlur={() => onChange(value.map((s) => s.trim()).filter(Boolean))}
        placeholder="Separa los elementos con punto y coma"
        maxLength={4000}
      />
    </Field>
  );
}
export function RelatedFields({ title, options, selected, onChange }) {
  return (
    <fieldset className="editor-related">
      <legend>{title}</legend>
      {options.length ? (
        options.map((r) => (
          <label className="editor-check" key={r.id}>
            <input
              type="checkbox"
              checked={selected.includes(r.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, r.id]
                    : selected.filter((id) => id !== r.id),
                )
              }
            />
            <span>{r.name}</span>
          </label>
        ))
      ) : (
        <p className="foot-note">
          No hay fichas publicadas que coincidan con la búsqueda.
        </p>
      )}
      {selected
        .filter((id) => !options.some((r) => r.id === id))
        .map((id) => (
          <label className="editor-check" key={id}>
            <input
              type="checkbox"
              checked
              onChange={() => onChange(selected.filter((v) => v !== id))}
            />
            <span>Referencia seleccionada fuera de estos resultados</span>
          </label>
        ))}
    </fieldset>
  );
}
