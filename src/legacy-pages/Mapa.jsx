import React from 'react';
import useRemoteData from './useRemoteData.js';
import { getInicioData } from '../services/api.js';
import PueblaHexMap from '../components/map/PueblaHexMap.jsx';
import { PageHeader, Loading } from './CatalogPage.jsx';
export default function Mapa() {
  const {loading,data,error}=useRemoteData(getInicioData,[]);
  // En páginas que consumen objetos, hay que salir antes de renderizar sus propiedades.
  if (loading) return <><PageHeader title="Mapa gastronómico de Puebla" description="Explora la distribución territorial de ingredientes, recetas, mercados, cocineras y protecciones legales." /><div className="loading-state">Cargando mapa…</div></>;
  if (error || !data) return <div className="empty-state">No fue posible cargar los datos del mapa.</div>;
  return <><PageHeader title="Mapa gastronómico de Puebla" description="Explora la distribución territorial de ingredientes, recetas, mercados, cocineras y protecciones legales." /><Loading loading={loading} error={error}><div className="g-card"><div className="g-ch"><h3>Actividad registrada por zona</h3><span className="g-tag">Vista esquemática del mockup</span></div><div className="g-mapwrap" style={{maxWidth:760,margin:'0 auto'}}><PueblaHexMap markers={data.markers}/><div className="g-leg"><b>Tipo de registro</b>{[['#4F7A4A','Ingredientes'],['#C1531E','Recetas'],['#D89A2E','Mercados'],['#10284C','Cocineras y cocineros'],['#B23A1F','Protección legal']].map(([color,label])=><div key={label}><i style={{background:color}}/>{label}</div>)}</div></div><p className="foot-note">Este mapa conserva la visualización hexagonal del HTML de referencia. Los puntos son ilustrativos y no representan coordenadas geográficas precisas.</p></div></Loading></>;
}
