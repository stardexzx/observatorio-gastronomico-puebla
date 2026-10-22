import { useState } from 'react';
import Icon from '../../assets/icons.jsx';
import { sourceLabel } from '../../services/api.js';
import { PAGE_SIZE } from '../../pages/useCatalog.js';
export function CatalogFilters({ catalog }) {
  const [input, setInput] = useState(catalog.query);
  return <form className="g-filters catalog-filters" role="search" onSubmit={event => { event.preventDefault(); catalog.search(input); }}>
    <label className="g-input"><Icon name="search" size={16}/><input aria-label="Buscar en este catálogo" maxLength={200} value={input} onChange={event => setInput(event.target.value)} placeholder="Buscar por nombre o descripción…"/></label>
    <button className="g-btn p" type="submit">Buscar</button>
    {catalog.query && <button className="g-btn" type="button" onClick={() => { setInput(''); catalog.search(''); }}>Limpiar</button>}
  </form>;
}
export function CatalogResults({ catalog, children }) {
  if (catalog.loading) return <div className="loading-state" role="status">Cargando registros…</div>;
  if (catalog.error) return <div className="empty-state" role="alert"><p>No fue posible cargar el contenido.</p><button className="g-btn" onClick={catalog.retry}>Intentar de nuevo</button></div>;
  return <>
    <div className="g-count" aria-live="polite">{catalog.items.length} registros en esta página <span>{sourceLabel}</span></div>
    {catalog.items.length ? children : <div className="empty-state">{catalog.query ? 'No se encontraron resultados. Prueba otra búsqueda.' : 'Todavía no hay registros publicados en esta sección.'}</div>}
    <div className="catalog-pagination" aria-label="Paginación">
      <button type="button" className="g-btn" disabled={catalog.offset === 0} onClick={catalog.previous}>Anterior</button>
      <span>Página {Math.floor(catalog.offset / PAGE_SIZE) + 1}</span>
      <button type="button" className="g-btn" disabled={!catalog.hasMore} onClick={catalog.next}>Siguiente</button>
    </div>
  </>;
}
