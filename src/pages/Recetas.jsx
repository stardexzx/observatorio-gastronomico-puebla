import React from 'react';
import useCatalog from './useCatalog.js';
import { CatalogFilters, CatalogResults } from '../components/catalog/CatalogControls.jsx';
import { getRecetas } from '../services/api.js';
import { CatalogCard, PageHeader } from './CatalogPage.jsx';
export default function Recetas() {
  const catalog=useCatalog(getRecetas);
  const registros = catalog.items;
  return <><PageHeader title="Recetas históricas" description="Recetarios, técnicas culinarias y platillos que forman parte del patrimonio gastronómico poblano." /><CatalogFilters catalog={catalog}/><CatalogResults catalog={catalog}>{<><div className="catalog-grid">{registros.map((r,i)=><CatalogCard key={r.id} to={`/recetas/${r.id}`} title={r.n} place={r.p} description={r.d} colors={r.cl || ['#4A2416','#C89A5B']} seed={i+1} status={r.v?'✓ Verificada':'En revisión'} />)}</div></>}</CatalogResults></>;
}
