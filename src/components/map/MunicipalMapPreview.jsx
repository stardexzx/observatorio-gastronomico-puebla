import { useNavigate, Link } from "react-router-dom";
import { getMunicipalMap } from "../../services/api.js";
import useRemoteData from "../../pages/useRemoteData.js";
import MunicipalMap from "./MunicipalMap.jsx";
export default function MunicipalMapPreview() {
  const result = useRemoteData(getMunicipalMap, []),
    navigate = useNavigate();
  if (result.loading)
    return <div className="loading-state">Cargando mapa municipal…</div>;
  if (result.error)
    return (
      <div className="empty-state" role="alert">
        No fue posible cargar el mapa.{" "}
        <button className="g-btn" onClick={result.retry}>
          Reintentar
        </button>
      </div>
    );
  return (
    <>
      <MunicipalMap
        data={result.data}
        compact
        onSelect={(code) => navigate(`/mapa?municipio=${code}`)}
      />
      <Link className="g-link" to="/mapa">
        Explorar el mapa completo →
      </Link>
    </>
  );
}
