import { Link } from "react-router-dom";
import { usesDatabase } from "../../services/api.js";
export default function RecordActions({ resource, id, label }) {
  if (usesDatabase) return null;
  return (
    <div className="demo-ficha-actions">
      <Link className="g-btn p" to={`/admin/${resource}/${id}`}>
        Editar {label}
      </Link>
      <Link className="g-btn" to={`/admin/${resource}/nueva`}>
        + Registrar {label}
      </Link>
    </div>
  );
}
