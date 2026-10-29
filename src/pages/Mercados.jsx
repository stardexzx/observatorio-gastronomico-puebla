import React from "react";
import { Link } from "react-router-dom";
import { usesDatabase } from "../services/api.js";
import useCatalog from "./useCatalog.js";
import {
  CatalogFilters,
  CatalogResults,
} from "../components/catalog/CatalogControls.jsx";
import { getMercados } from "../services/api.js";
import { CatalogCard, PageHeader } from "./CatalogPage.jsx";
export default function Mercados() {
  const catalog = useCatalog(getMercados);
  const registros = catalog.items;
  return (
    <>
      <PageHeader
        title="Mercados y tianguis"
        description="Espacios de abasto, intercambio y transmisión de saberes que sostienen las cocinas tradicionales."
      />
      {!usesDatabase && (
        <div className="g-filters">
          <Link className="g-btn p" to="/admin/mercados/nueva">
            Registrar mercado
          </Link>
        </div>
      )}
      <CatalogFilters catalog={catalog} />
      <CatalogResults catalog={catalog}>
        {
          <div className="catalog-grid">
            {registros.map((m, i) => (
              <CatalogCard
                key={m.id}
                to={`/mercados/${m.id}`}
                title={m.n}
                place={m.m}
                description={m.d}
                type="market"
                colors={["#D89A2E", "#C89A5B"]}
                seed={i + 1}
                status={m.tp}
              />
            ))}
          </div>
        }
      </CatalogResults>
    </>
  );
}
