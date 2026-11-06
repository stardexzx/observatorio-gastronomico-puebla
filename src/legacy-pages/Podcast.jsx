import { Link } from 'react-router-dom';
import { getEpisodes, getPodcasts, usesDatabase } from '../services/api.js';
import useCatalog from './useCatalog.js';
import { PageHeader } from './CatalogPage.jsx';
import { CatalogFilters, CatalogResults } from '../components/catalog/CatalogControls.jsx';
import useRemoteData from './useRemoteData.js';
export default function Podcast() {
  const catalog = useCatalog(getEpisodes);
  const series = useRemoteData(getPodcasts, []);
  return <><PageHeader title="Podcast" description="Voces, historias y conversaciones sobre el patrimonio gastronómico de Puebla."/>
    {!usesDatabase && <p className="foot-note">La colección de demostración todavía no incluye episodios.</p>}
    {!!series.data?.items.length && <section className="g-card podcast-series"><h3>Series del Observatorio</h3><div className="g-chips">{series.data.items.map(s => <Link className="g-chip" to={s.to} key={s.id}>{s.n}</Link>)}</div></section>}
    <CatalogFilters catalog={catalog}/><CatalogResults catalog={catalog}><div className="catalog-grid">{catalog.items.map(e => <Link className="catalog-card search-result" to={e.to} key={e.id}><span className="g-tag">Episodio</span><h3>{e.n}</h3><p className="g-sm">{e.d}</p><span className="g-link">Escuchar y ver detalles →</span></Link>)}</div></CatalogResults>
  </>;
}
