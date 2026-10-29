import { Link } from "react-router-dom";
export function SourceNote({ record }) {
  return (
    <p className="foot-note">
      {record.source === "database"
        ? "Versión publicada y revisada por el Observatorio. Las ilustraciones son representaciones de la interfaz."
        : record.seeded
          ? "Referencia ilustrativa del mockup, disponible en este demo."
          : "Registro del demo guardado en este navegador."}
    </p>
  );
}
export function PublicRelations({ record }) {
  if (!record.relations?.length) return null;
  return (
    <section className="g-card public-relations">
      <h3>Conocimiento relacionado</h3>
      <div className="g-chips">
        {record.relations.map((r, i) => (
          <Link className="g-chip" key={`${r.id}-${i}`} to={r.to}>
            {r.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
