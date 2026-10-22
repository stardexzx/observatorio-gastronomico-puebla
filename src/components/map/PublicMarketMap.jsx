import { Link } from 'react-router-dom';
import PueblaHexMap from './PueblaHexMap.jsx';
// Proyección aproximada sobre el mapa esquemático original, no cartografía oficial.
export function schematicMarkers(features = []) {
  return features.flatMap(f => {
    const [lng, lat] = f.geometry?.coordinates || [];
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < -99.1 || lng > -96.7 || lat < 17.8 || lat > 20.9) return [];
    return [{ id: f.id, n: f.properties.nombre, t: 'mer', x: 34 + (lng + 99.1) / 2.4 * 304, y: 14 + (20.9 - lat) / 3.1 * 278 }];
  });
}
export default function PublicMarketMap({ features = [], selected, onSelect }) {
  return <><div className="g-mapwrap"><PueblaHexMap mode="base" markers={schematicMarkers(features)} onSelect={onSelect}/><div className="g-leg"><b>Mercados publicados</b><div><i style={{ background: '#D89A2E' }}/>{features.length} ubicaciones documentadas</div></div></div>
    {selected && <div className="map-selection" role="status"><b>{selected.properties.nombre}</b><span>{selected.geometry.coordinates[1]}, {selected.geometry.coordinates[0]}</span><Link className="g-link" to={`/mercados/${selected.id}`}>Ver ficha →</Link></div>}
    <p className="foot-note">Mapa esquemático del diseño original. Los puntos se proyectan de forma aproximada; las coordenadas publicadas se consultan en cada ficha.</p>
  </>;
}
