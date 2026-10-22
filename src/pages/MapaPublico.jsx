import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getMapData } from '../services/api.js';
import useRemoteData from './useRemoteData.js';
import { Loading, PageHeader } from './CatalogPage.jsx';
import PublicMarketMap from '../components/map/PublicMarketMap.jsx';
export default function MapaPublico() {
  const result = useRemoteData(getMapData, []);
  const [selectedId, setSelectedId] = useState(null);
  const features = result.data?.features || [];
  return <><PageHeader title="Mapa gastronómico de Puebla" description="Explora los mercados y tianguis con ubicación documentada y publicada por el Observatorio."/>
    <Loading {...result}><div className="g-1-2"><section className="g-card"><div className="g-ch"><h3>Actividad registrada por zona</h3><span className="g-tag">Mercados y tianguis</span></div>
      <PublicMarketMap features={features} selected={features.find(f => f.id === selectedId)} onSelect={setSelectedId}/>
    </section><section className="g-card"><h3>Ubicaciones publicadas</h3>{features.length ? features.map(f => <div className="g-row" key={f.id}><div><button type="button" className="map-record" aria-pressed={selectedId === f.id} onClick={() => setSelectedId(f.id)}>{f.properties.nombre}</button><small>Precisión {f.properties.precision} · {f.geometry.coordinates[1]}, {f.geometry.coordinates[0]}</small></div><Link className="g-link" to={`/mercados/${f.id}`}>Ver ficha</Link></div>) : <div className="empty-state">Todavía no hay mercados publicados con ubicación documentada.</div>}</section></div></Loading>
  </>;
}
