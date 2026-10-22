import { Link, useParams } from 'react-router-dom';
import useRemoteData from './useRemoteData.js';
import { getRecetaById } from '../services/api.js';
import { Loading } from './CatalogPage.jsx';
import Plate from '../components/illustrations/Plate.jsx';
import { SourceNote, PublicRelations } from '../components/catalog/PublicDetails.jsx';

export default function RecetaDetalle() {
  const { id } = useParams();
  const result = useRemoteData(() => getRecetaById(id), [id]);
  const data = result.data;
  return <Loading {...result}>{data ? <>
    <Link className="detail-back" to="/recetas">← Volver a recetas</Link>
    <div className="g-h"><h1>{data.n}</h1><p>{data.p} · {data.e}</p></div>
    <div className="detail-layout">
      <section className="g-card">
        <div style={{height:180,borderRadius:10,overflow:'hidden',marginBottom:14}}><Plate color1={data.cl?.[0]} color2={data.cl?.[1]} seed={1}/></div>
        <h3>Descripción</h3><p className="g-p">{data.d}</p>
        {data.context && <p className="g-p">{data.context}</p>}
        <h3>Ingredientes documentados</h3>
        {(data.ing || []).map(([name, description], i) => <div className="g-row" key={`${name}-${i}`}><div><b>{name}</b><small>{description}</small></div></div>)}
        {!!data.steps?.length && <><h3>Preparación documentada</h3><ol className="recipe-steps">{data.steps.map(step => <li key={step.orden}>{step.instrucciones}</li>)}</ol></>}
        {!!data.techniques?.length && <><h3>Técnicas</h3><div className="g-chips">{data.techniques.map(t => <span className="g-chip" key={t.codigo}>{t.nombre}</span>)}</div></>}
        {data.limitations && <p className="foot-note">{data.limitations}</p>}
        <h3 style={{marginTop:14}}>Fuentes</h3>{(data.fu || []).map((source, i) => <p className="g-p" key={i}>{source}</p>)}
      </section>
      <aside className="g-detail">
        <span className={`g-tag ${data.v ? 'ok' : 'warn'}`}>{data.v ? 'Verificada' : 'En revisión'}</span>
        <div className="g-kv"><div><small>Origen principal</small><b>{data.p}</b></div><div><small>Época</small><b>{data.e}</b></div><div><small>Relaciones</small><b>{data.rel ?? '—'}</b></div></div>
        <SourceNote record={data}/>
      </aside>
    </div><PublicRelations record={data}/>
  </> : <div className="empty-state">No se encontró una receta con ID “{id}”. <Link to="/recetas">Volver al catálogo</Link></div>}</Loading>;
}
