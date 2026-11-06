import { Link } from 'react-router-dom';
import { getInicioData } from '../services/api.js';
import useRemoteData from './useRemoteData.js';
import { Loading, PageHeader } from './CatalogPage.jsx';
import PublicKpis from '../components/charts/PublicKpis.jsx';
import MunicipalMapPreview from '../components/map/MunicipalMapPreview.jsx';
import Icon from '../assets/icons.jsx';
const quick = [['/mapa','Mapa gastronómico','pin'],['/recetas','Recetas históricas','recipe'],['/mercados','Mercados y tianguis','stall'],['/cocineras','Cocineras y cocineros','person'],['/proteccion-legal','Protección legal','shield']];
export default function InicioPublico() {
  const panel = useRemoteData(getInicioData, []);
  return <><PageHeader title="Bienvenida al Observatorio Gastronómico de Puebla" description="Explora, conoce y valora el patrimonio gastronómico de Puebla. Datos, historias y personas que preservan nuestras tradiciones."/>
    <Loading {...panel}>{panel.data && <>
      <PublicKpis data={panel.data}/><div className="g-1-2">
        <section className="g-card"><div className="g-ch"><h3><Icon name="pin" size={17}/>Patrimonio registrado en Puebla</h3><Link className="g-link" to="/mapa">Explorar mapa →</Link></div><MunicipalMapPreview/></section>
        <section className="g-card"><div className="g-ch"><h3>Publicaciones recientes</h3><Link className="g-link" to="/reportes">Ver reportes</Link></div>
          {panel.data.recent.length ? panel.data.recent.map(item => <Link className="g-row public-recent" key={item.id} to={item.to}><div><b>{item.n}</b><small>{item.p}</small></div><span className="g-tag ok">Publicada</span></Link>) : <div className="empty-state">Todavía no hay fichas publicadas. Aquí aparecerán los registros aprobados por el Observatorio.</div>}
        </section></div>
    </>}</Loading>
    <h2 className="g-h2">Explora el patrimonio gastronómico</h2><div className="g-quick">{quick.map(([to,title,icon]) => <Link className="g-qc" to={to} key={to}><span className="g-dot" style={{width:38,height:38,background:'#10284C'}}><Icon name={icon} size={20}/></span><b>{title}</b><span>Explorar registros</span></Link>)}</div>
  </>;
}
