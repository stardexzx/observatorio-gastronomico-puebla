import { Link } from "react-router-dom";
import { useState } from "react";
import { useEditor } from "../components/editor/EditorSession.jsx";
import { editorPeople, editorialStatus } from "../services/editorApi.js";
import useRemoteData from "./useRemoteData.js";
import { PageHeader } from "./CatalogPage.jsx";
export default function AdminPersonas() {
  const session = useEditor(),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("");
  const result = useRemoteData(
    () => editorPeople(search, status),
    [search, status],
  );
  const [sessionError, setSessionError] = useState("");
  return (
    <>
      <div className="editor-heading">
        <PageHeader
          title="Cocineras y cocineros — captura"
          description="Documenta a quienes preservan, practican y transmiten los saberes culinarios de Puebla."
        />
        <div className="editor-account">
          <span>{session.user.name}</span>
          <button
            className="g-btn"
            onClick={async () => {
              try {
                await session.logout();
              } catch (e) {
                setSessionError(e.message);
              }
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      {sessionError && (
        <p className="editor-error" role="alert">
          {sessionError}
        </p>
      )}
      <div className="g-filters">
        <Link className="g-btn" to="/cocineras">
          Ver directorio público
        </Link>
        {session.user.permissions.crear && (
          <Link className="g-btn p" to="/admin/cocineras/nueva">
            Nuevo registro
          </Link>
        )}
      </div>
      <form
        className="g-filters catalog-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query);
        }}
      >
        <label className="g-input">
          <input
            aria-label="Buscar fichas de captura"
            placeholder="Buscar nombre o comunidad…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={200}
          />
        </label>
        <button className="g-btn">Buscar</button>
        <label className="editor-field">
          <span>Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(editorialStatus).map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </form>
      <section className="g-card">
        {result.loading ? (
          <div className="loading-state">Cargando fichas…</div>
        ) : result.error ? (
          <div className="empty-state" role="alert">
            <p>{result.error.message}</p>
            <button className="g-btn" onClick={result.retry}>
              Reintentar
            </button>
          </div>
        ) : result.data?.items.length ? (
          <div className="editor-table-wrap">
            <table className="g-tbl">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Municipio y comunidad</th>
                  <th>Estado</th>
                  <th>Actualización</th>
                  <th>Ficha</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.name}</b>
                    </td>
                    <td>
                      {r.municipality || "Sin documentar"}
                      <small>{r.community}</small>
                    </td>
                    <td>
                      <span
                        className={`g-tag ${r.status === "publicado" ? "ok" : "blue"}`}
                      >
                        {editorialStatus[r.status] || r.status}
                      </span>
                    </td>
                    <td>
                      {new Date(r.updated_at).toLocaleDateString("es-MX")}
                    </td>
                    <td>
                      <Link className="g-link" to={`/admin/cocineras/${r.id}`}>
                        Abrir ficha →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            No hay fichas con estos filtros. Crea un registro para comenzar.
          </div>
        )}
      </section>
      {result.data?.limited && (
        <p className="foot-note">
          Se muestran hasta 200 fichas; afina la búsqueda para encontrar
          registros anteriores.
        </p>
      )}
    </>
  );
}
