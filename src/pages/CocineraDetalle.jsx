import { SourceNote, PublicRelations } from '../components/catalog/PublicDetails.jsx';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import useRemoteData from './useRemoteData.js';
import { getCocineraById } from '../services/api.js';
import { Loading } from './CatalogPage.jsx';
export default function CocineraDetalle() {
  const {id}=useParams(); const {loading,data,error}=useRemoteData(()=>getCocineraById(id),[id]);
  return <Loading loading={loading} error={error}>{data ? <><Link className="detail-back" to="/cocineras">← Volver al directorio</Link><div className="g-h"><h1>{data.n}</h1><p>{data.rol} · {data.m}</p></div><div className="detail-layout"><section className="g-card">{data.q && <div className="g-quote">“{data.q}”</div>}<h3>Biografía</h3><p className="g-p">{data.bio}</p><h3>Especialidades</h3><div className="g-chips">{data.esp.map(t=><span className="g-chip" key={t}>{t}</span>)}</div><h3 style={{marginTop:14}}>Recetas insignia</h3>{data.ins.map(item=><div className="g-row" key={item}><div><b>{item}</b></div></div>)}</section><aside className="g-detail"><div className="g-kv"><div><small>Lengua(s)</small><b>{data.len}</b></div><div><small>Recetas vinculadas</small><b>{data.rec}</b></div><div><small>Mercados vinculados</small><b>{data.mer}</b></div><div><small>Colectivo</small><b>{data.org}</b></div></div>{(data.ver||[]).map(v=><p className="g-p" key={v}>✓ {v}</p>)}<SourceNote record={data}/></aside></div><PublicRelations record={data}/></> : <div className="empty-state">No se encontró la ficha. <Link to="/cocineras">Volver al directorio</Link></div>}</Loading>;
}
