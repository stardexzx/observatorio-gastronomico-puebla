import { Link, useSearchParams } from 'react-router-dom';
import { searchRecords } from '../services/api.js';
import useCatalog from './useCatalog.js';
import { PageHeader } from './CatalogPage.jsx';
import { CatalogFilters, CatalogResults } from '../components/catalog/CatalogControls.jsx';
export default function Buscar() {
  const [params] = useSearchParams();
  const initial = params.get('q') || '';
  return <SearchResults key={initial} initial={initial}/>;
}
function SearchResults({ initial }) {
  const catalog = useCatalog(searchRecords, initial);
  return <><PageHeader title="Resultados de búsqueda" description="Busca en las recetas, los mercados, las personas y los demás registros del Observatorio."/>
    <CatalogFilters catalog={catalog}/><CatalogResults catalog={catalog}>
      <div className="catalog-grid">{catalog.items.map(item => <Link to={item.to} className="catalog-card search-result" key={`${item.type || item.typeLabel}-${item.id}`}>
        <span className="g-tag">{item.typeLabel || ({ receta: 'Receta', mercado: 'Mercado', persona: 'Cocinera o cocinero', ingrediente: 'Ingrediente', instrumento: 'Protección legal', episodio: 'Episodio' })[item.type] || 'Registro público'}</span>
        <h3>{item.n}</h3><p className="g-sm">{item.d || item.bio || item.p || item.m}</p><span className="g-link">Ver ficha →</span>
      </Link>)}</div>
    </CatalogResults></>;
}
