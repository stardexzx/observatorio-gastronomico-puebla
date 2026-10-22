import React from 'react';
import { Link } from 'react-router-dom';
import Plate from '../components/illustrations/Plate.jsx';
import StallArt from '../components/illustrations/StallArt.jsx';
export function Loading({loading,error,children}) { if (loading) return <div className="loading-state" role="status">Cargando registros…</div>; if (error) return <div className="empty-state" role="alert">No fue posible cargar el contenido. Intenta nuevamente más tarde.</div>; return children; }
export function CatalogCard({to,title,place,description,type='recipe',colors=['#4A2416','#C89A5B'],seed=1,status}) {
  return <Link className="catalog-card" to={to}><div className="catalog-thumb">{type==='market'?<StallArt color={colors[0]} />:<Plate color1={colors[0]} color2={colors[1]} seed={seed} />}</div><div className="catalog-body"><b>{title}</b><small>{place}</small>{description && <small>{description}</small>}{status && <span className="catalog-status">{status}</span>}</div></Link>;
}
export function PageHeader({title,description}) { return <div className="g-h"><h1>{title}</h1><p>{description}</p></div>; }
