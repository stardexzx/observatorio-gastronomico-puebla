import { Link } from "react-router-dom";
import { useState } from "react";
import {
  demoSnapshot,
  exportDemo,
  listDemoDrafts,
  resources,
} from "../services/demoStore.js";
import useRemoteData from "./useRemoteData.js";
import { Loading, PageHeader } from "./CatalogPage.jsx";

export default function DemoAdmin({ resource }) {
  const [query, setQuery] = useState(""),
    [error, setError] = useState("");
  const result = useRemoteData(
    async () => ({
      catalogs: await demoSnapshot(),
      drafts: await listDemoDrafts(),
    }),
    [],
  );
  const current = resource || "cocineras";
  const rows = (result.data?.catalogs[current] || []).filter((r) =>
    r.n.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  async function download() {
    try {
      const blob = new Blob([JSON.stringify(await exportDemo(), null, 2)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "observatorio-demo-local.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <PageHeader
        title="Registros del Observatorio"
        description="Crea y vincula cocineras y cocineros, recetas y mercados. Tus cambios se conservan en este navegador."
      />
      <div className="demo-admin-toolbar">
        <div className="demo-admin-tabs">
          {Object.entries(resources).map(([key, meta]) => (
            <Link
              key={key}
              className={`g-btn ${current === key ? "p" : ""}`}
              to={`/admin/${key}`}
            >
              {meta.label}
              <span>{result.data?.catalogs[key].length ?? "…"}</span>
            </Link>
          ))}
        </div>
        <button className="g-btn" onClick={download}>
          Descargar copia de los registros
        </button>
      </div>
      {error && (
        <p className="editor-error" role="alert">
          {error}
        </p>
      )}
      <Loading {...result}>
        {result.data && (
          <>
            <section className="g-card">
              <div className="demo-admin-toolbar">
                <h2>{resources[current].label}</h2>
                <Link className="g-btn p" to={`/admin/${current}/nueva`}>
                  + Registrar {resources[current].singular}
                </Link>
              </div>
              <label className="editor-field">
                <span>Buscar registros</span>
                <input
                  type="search"
                  placeholder="Buscar por nombre…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="demo-record-list">
                {rows.map((r) => (
                  <article key={r.id}>
                    <div>
                      <Link
                        className="demo-record-title"
                        to={`/${current}/${r.id}`}
                      >
                        {r.n}
                      </Link>
                      <p className="g-sm">
                        {r.m || r.p || "Origen por completar"} ·{" "}
                        {r.seeded ? "Referencia del mockup" : "Registro local"}
                      </p>
                    </div>
                    <div className="demo-record-links">
                      <Link className="g-link" to={`/${current}/${r.id}`}>
                        Ver ficha
                      </Link>
                      <Link className="g-btn" to={`/admin/${current}/${r.id}`}>
                        Editar
                      </Link>
                    </div>
                  </article>
                ))}
                {!rows.length && (
                  <p className="empty-state">
                    No hay registros con ese nombre.
                  </p>
                )}
              </div>
            </section>
            {!!result.data.drafts.length && (
              <section className="g-card demo-drafts">
                <h3>Continuar un borrador</h3>
                <p className="g-sm">
                  Los borradores todavía no aparecen en los catálogos.
                </p>
                {result.data.drafts.map((d) => (
                  <Link className="g-row demo-draft" key={d.key} to={d.path}>
                    <div>
                      <b>{d.name}</b>
                      <small>{resources[d.resource]?.label}</small>
                    </div>
                    <span>Continuar →</span>
                  </Link>
                ))}
              </section>
            )}
          </>
        )}
      </Loading>
    </>
  );
}
