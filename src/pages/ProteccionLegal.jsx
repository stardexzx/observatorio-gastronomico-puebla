import useRemoteData from './useRemoteData.js';
import { LegalKpis } from '../components/charts/PublicKpis.jsx';
import React from 'react';
import useCatalog from './useCatalog.js';
import { CatalogFilters, CatalogResults } from '../components/catalog/CatalogControls.jsx';
import { getDeclaratorias, getLegalSummary } from '../services/api.js';
import { Loading, PageHeader } from './CatalogPage.jsx';
import { Link } from 'react-router-dom';
export default function ProteccionLegal() {
  const catalog=useCatalog(getDeclaratorias);
  const summary=useRemoteData(getLegalSummary,[]);
  const registros = catalog.items;
  return <><PageHeader title="Protección legal" description="Declaratorias, indicaciones geográficas y expedientes de protección del patrimonio gastronómico." /><Loading {...summary}>{summary.data && <LegalKpis data={summary.data}/>}</Loading><CatalogFilters catalog={catalog}/><CatalogResults catalog={catalog}><div className="g-card"><div className="g-ch"><h3>Declaratorias e Indicaciones Geográficas</h3><span className="g-tag">{registros.length} registros</span></div><div style={{overflowX:'auto'}}><table className="g-tbl"><thead><tr><th>Nombre</th><th>Tipo</th><th>Jurisdicción</th><th>Estado</th><th>Fecha</th><th>Ver</th></tr></thead><tbody>{registros.map(item=><tr key={item.id}><td><b style={{color:'var(--navy)'}}>{item.n}</b></td><td>{item.tpn}</td><td>{item.j}</td><td><span className={`g-tag ${['Otorgada','Vigente'].includes(item.st)?'ok':'warn'}`}>{item.st}</span></td><td>{item.f}</td><td><Link className="g-link" to={`/proteccion-legal/${item.id}`}>Ver ficha ↗</Link></td></tr>)}</tbody></table></div></div></CatalogResults></>;
}
