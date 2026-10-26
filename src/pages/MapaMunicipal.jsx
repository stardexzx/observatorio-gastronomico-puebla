import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getMunicipalMap,
  getMunicipalities,
  mapTypes,
  usesDatabase,
} from "../services/api.js";
import useRemoteData from "./useRemoteData.js";
import { PageHeader } from "./CatalogPage.jsx";
import MunicipalMap from "../components/map/MunicipalMap.jsx";
export default function MapaMunicipal() {
  const [params, setParams] = useSearchParams(),
    [query, setQuery] = useState(params.get("q") || "");
  const key = params.toString(),
    municipality = params.get("municipio") || "";
  const types = params.has("tipos")
    ? params.get("tipos").split(",").filter(Boolean)
    : mapTypes.map((t) => t.key);
  const result = useRemoteData(
    () =>
      getMunicipalMap({
        types,
        municipality,
        query: params.get("q") || "",
        from: params.get("desde") || "",
        to: params.get("hasta") || "",
      }),
    [key],
  );
  const municipalities = useRemoteData(getMunicipalities, []);
  useEffect(() => setQuery(params.get("q") || ""), [key]);
  const change = (name, value) => {
    const next = new URLSearchParams(params);
    if (value || name === "tipos") next.set(name, value);
    else next.delete(name);
    setParams(next);
  };
  const selectedName = municipalities.data?.find(
    (m) => m.code === municipality,
  )?.name;
  return (
    <>
      <PageHeader
        title="Mapa gastronómico de Puebla"
        description="Explora ingredientes, recetas, mercados, cocineras y protecciones legales en los municipios de Puebla."
      />
      <form
        className="g-filters catalog-filters"
        onSubmit={(e) => {
          e.preventDefault();
          change("q", query);
        }}
        role="search"
      >
        <label className="g-input">
          <input
            type="search"
            aria-label="Buscar en el mapa"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={200}
            placeholder="Buscar en el mapa…"
          />
        </label>
        <button className="g-btn p">Buscar</button>
        <button
          type="button"
          className="g-btn"
          onClick={() => {
            setQuery("");
            setParams({});
          }}
        >
          Limpiar filtros
        </button>
      </form>
      <div className="map-layout">
        <section className="g-card map-main">
          <aside className="map-layers">
            <h3>Capas</h3>
            {mapTypes.map((t) => (
              <label key={t.key}>
                <span>
                  <i style={{ background: t.color }} />
                  {t.label}
                </span>
                <input
                  type="checkbox"
                  checked={types.includes(t.key)}
                  onChange={(e) =>
                    change(
                      "tipos",
                      (e.target.checked
                        ? [...types, t.key]
                        : types.filter((k) => k !== t.key)
                      ).join(","),
                    )
                  }
                />
              </label>
            ))}
            <hr />
            <label className="editor-field">
              <span>Municipio</span>
              <select
                aria-label="Municipio"
                value={municipality}
                onChange={(e) => change("municipio", e.target.value)}
              >
                <option value="">Todos los municipios</option>
                {municipalities.data?.map((m) => (
                  <option value={m.code} key={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            {usesDatabase && (
              <>
                <h4>Fecha de publicación</h4>
                <label className="editor-field">
                  <span>Desde</span>
                  <input
                    type="date"
                    value={params.get("desde") || ""}
                    onChange={(e) => change("desde", e.target.value)}
                  />
                </label>
                <label className="editor-field">
                  <span>Hasta</span>
                  <input
                    type="date"
                    min={params.get("desde") || undefined}
                    value={params.get("hasta") || ""}
                    onChange={(e) => change("hasta", e.target.value)}
                  />
                </label>
              </>
            )}
            <p className="foot-note">
              Los colores representan registros del conjunto seleccionado. Un
              mismo registro puede estar vinculado a varios municipios.
            </p>
          </aside>
          <div className="map-content">
            {result.loading ? (
              <div className="loading-state" role="status">
                Cargando municipios y registros…
              </div>
            ) : result.error ? (
              <div className="empty-state" role="alert">
                <p>
                  No fue posible cargar el mapa. Revisa los filtros e inténtalo
                  de nuevo.
                </p>
                <button className="g-btn" onClick={result.retry}>
                  Reintentar
                </button>
              </div>
            ) : (
              <MunicipalMap
                data={result.data}
                selected={municipality}
                onSelect={(code) =>
                  change("municipio", code === municipality ? "" : code)
                }
              />
            )}
            <p className="foot-note">
              Límites simplificados del archivo de referencia, con atribución
              declarada a INEGI (diciembre de 2025). Los puntos corresponden a
              ubicaciones publicadas de mercados; las personas se representan
              mediante su vínculo municipal.
            </p>
          </div>
        </section>
        <aside className="g-detail map-results">
          <h3>{selectedName || "Resultados del mapa"}</h3>
          {municipality && (
            <button className="g-btn" onClick={() => change("municipio", "")}>
              Quitar filtro municipal
            </button>
          )}
          <p className="g-sm" aria-live="polite">
            {result.data?.total || 0} registros encontrados
          </p>
          {result.data && result.data.total > result.data.mapped && (
            <p className="foot-note">
              {result.data.total - result.data.mapped} fichas no tienen vínculo
              municipal documentado y no se cuentan dentro de los polígonos.
            </p>
          )}
          {result.data?.records.map((r) => (
            <Link
              className="g-row public-recent"
              to={r.to}
              key={`${r.type}-${r.id}`}
            >
              <div>
                <b>{r.n}</b>
                <small>
                  {mapTypes.find((t) => t.key === r.type)?.label} ·{" "}
                  {r.m || r.p || ""}
                </small>
              </div>
            </Link>
          ))}
          {!result.loading && !result.error && !result.data?.records.length && (
            <div className="empty-state">
              No hay registros para estos filtros.
            </div>
          )}
          {result.data?.limited && (
            <p className="foot-note">
              Se muestran las primeras 100 fichas. Selecciona un municipio o
              afina la búsqueda para consultar el resto.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
