import { useMemo, useState } from "react";
import { getMunicipalGeometry } from "../../services/api.js";
import useRemoteData from "../../pages/useRemoteData.js";
import MunicipalMap from "../map/MunicipalMap.jsx";
import { normalize } from "../../services/demoStore.js";

export default function LocationPicker({
  value,
  name,
  coordinates,
  onChange,
  precise = false,
}) {
  const result = useRemoteData(getMunicipalGeometry, []);
  const [query, setQuery] = useState(""),
    [pointMode, setPointMode] = useState(false);
  const data = useMemo(
    () =>
      result.data
        ? {
            features: result.data.features.map((f) => ({
              ...f,
              properties: {
                code: f.properties.cvegeo,
                name: f.properties.nomgeo,
              },
            })),
            points: [],
          }
        : null,
    [result.data],
  );
  const selected = data?.features.find((f) => f.properties.code === value);
  const options = data?.features
    .filter((f) => normalize(f.properties.name).includes(normalize(query)))
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name, "es"));
  const select = (code) => {
    const feature = data.features.find((f) => f.properties.code === code);
    onChange({ code, name: feature.properties.name, coordinates: null });
  };
  return (
    <div className="demo-location wide">
      <div className="demo-location-head">
        <div>
          <h3>{precise ? "Ubicación del mercado" : "Lugar de origen"}</h3>
          <p className="g-sm">
            Busca un municipio o selecciónalo directamente en el mapa.
          </p>
        </div>
        {value && (
          <span className="g-tag gold">
            {selected?.properties.name || name}
          </span>
        )}
      </div>
      <label className="editor-field">
        <span>Buscar municipio</span>
        <input
          type="search"
          placeholder="Ej. Cuetzalan del Progreso"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {result.loading ? (
        <p role="status">Cargando municipios…</p>
      ) : result.error ? (
        <div role="alert">
          <p>No se pudo cargar el mapa.</p>
          <button type="button" className="g-btn" onClick={result.retry}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div
            className="demo-municipality-results"
            aria-label="Municipios encontrados"
          >
            {options.slice(0, query ? 15 : 6).map((f) => (
              <button
                type="button"
                key={f.properties.code}
                className={`g-btn ${value === f.properties.code ? "p" : ""}`}
                aria-pressed={value === f.properties.code}
                onClick={() => select(f.properties.code)}
              >
                {f.properties.name}
              </button>
            ))}
            {!options.length && <p>No hay municipios con ese nombre.</p>}
          </div>
          {precise && (
            <div className="demo-pin-tools">
              <button
                type="button"
                className={`g-btn ${pointMode ? "p" : ""}`}
                aria-pressed={pointMode}
                onClick={() => setPointMode((v) => !v)}
              >
                {pointMode
                  ? "Dejar de marcar"
                  : coordinates
                    ? "Mover ubicación en el mapa"
                    : "Marcar ubicación en el mapa"}
              </button>
              {coordinates && (
                <button
                  className="g-btn"
                  type="button"
                  onClick={() =>
                    onChange({
                      code: value,
                      name: selected?.properties.name || name,
                      coordinates: null,
                    })
                  }
                >
                  Quitar punto
                </button>
              )}
              <p className="foot-note">
                {pointMode
                  ? "Acerca el mapa y toca el lugar del mercado para colocar el punto."
                  : "Puedes añadir un punto aproximado además del municipio y la dirección."}
              </p>
            </div>
          )}
          <MunicipalMap
            data={data}
            selected={value}
            onSelect={select}
            selectionOnly
            focusSelected
            selectionHint={
              precise
                ? "El municipio y el punto marcado aparecerán en la ficha del mercado."
                : undefined
            }
            selectedPoint={coordinates}
            onPickPoint={
              pointMode
                ? (point, code) => {
                    const f = data.features.find(
                      (f) => f.properties.code === code,
                    );
                    onChange({
                      code,
                      name: f.properties.name,
                      coordinates: point,
                    });
                    setPointMode(false);
                  }
                : undefined
            }
          />
        </>
      )}
      {value && (
        <div className="demo-location-selected" role="status">
          <b>✓ {selected?.properties.name || name}, Puebla</b>
          <span>
            {coordinates
              ? "Ubicación marcada en el mapa"
              : "Municipio seleccionado"}
          </span>
        </div>
      )}
    </div>
  );
}
