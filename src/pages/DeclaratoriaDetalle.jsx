import { SourceNote, PublicRelations } from '../components/catalog/PublicDetails.jsx';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import useRemoteData from './useRemoteData.js';
import { getDeclaratoriaById } from '../services/api.js';
import { Loading } from './CatalogPage.jsx';
export default function DeclaratoriaDetalle() {
  const {id}=useParams(); const {loading,data,error}=useRemoteData(()=>getDeclaratoriaById(id),[id]);
  return <Loading loading={loading} error={error}>{data ? <><Link className="detail-back" to="/proteccion-legal">← Volver a protección legal</Link><div className="g-h"><h1>{data.n}</h1><p>{data.tpn} · {data.j}</p></div><div className="detail-layout"><section className="g-card"><span className={`g-tag ${['Otorgada','Vigente'].includes(data.st)?'ok':'warn'}`}>{data.st}</span><h3 style={{marginTop:12}}>Descripción</h3><p className="g-p">{data.d}</p><h3>Características distintivas</h3>{(data.car||[]).map(c=><div className="g-row" key={c}>✓ {c}</div>)}<h3 style={{marginTop:14}}>Documentos</h3>{(data.docs||[]).map(([name,meta])=><div className="g-row" key={name}><div><b>{name}</b><small>{meta}</small></div></div>)}</section><aside className="g-detail"><div className="g-kv"><div><small>Jurisdicción</small><b>{data.j}</b></div><div><small>Fecha</small><b>{data.f}</b></div><div><small>Autoridad</small><b>{data.a}</b></div><div><small>Verificación</small><b>{data.v?'Verificado':'En revisión'}</b></div><div><small>Municipios</small><b>{data.mun}</b></div></div><p className="g-p">{data.alc}</p></aside></div><PublicRelations record={data}/></> : <div className="empty-state">No se encontró la declaratoria. <Link to="/proteccion-legal">Volver</Link></div>}</Loading>;
}
