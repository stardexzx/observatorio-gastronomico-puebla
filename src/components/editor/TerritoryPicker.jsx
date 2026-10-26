import { useMemo } from "react";
import { getMunicipalGeometry } from "../../services/api.js";
import useRemoteData from "../../pages/useRemoteData.js";
import MunicipalMap from "../map/MunicipalMap.jsx";
export default function TerritoryPicker({ value, onChange }) {
  const result = useRemoteData(getMunicipalGeometry, []);
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
  if (result.loading)
    return <div className="loading-state">Cargando selección territorial…</div>;
  if (result.error)
    return (
      <p className="foot-note">
        El mapa no pudo cargarse. Puedes seleccionar el municipio en la lista.
      </p>
    );
  return (
    <div className="wide editor-territory-picker">
      <MunicipalMap
        data={data}
        selected={value}
        onSelect={onChange}
        selectionOnly
        compact
      />
    </div>
  );
}
