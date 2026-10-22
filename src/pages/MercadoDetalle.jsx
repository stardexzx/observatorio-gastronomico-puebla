import { SourceNote, PublicRelations } from '../components/catalog/PublicDetails.jsx';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import useRemoteData from './useRemoteData.js';
import { getMercadoById } from '../services/api.js';
import { Loading } from './CatalogPage.jsx';
import StallArt from '../components/illustrations/StallArt.jsx';
export default function MercadoDetalle() {
  const {id}=useParams(); const {loading,data,error}=useRemoteData(()=>getMercadoById(id),[id]);
  return <Loading loading={loading} error={error}>{data ? <><Link className="detail-back" to="/mercados">← Volver a mercados</Link><div className="g-h"><h1>{data.n}</h1><p>{data.tp} · {data.m}</p></div><div className="detail-layout"><section className="g-card"><div style={{height:190,borderRadius:10,overflow:'hidden',marginBottom:14}}><StallArt /></div><h3>Descripción</h3><p className="g-p">{data.d}</p><h3>Productos vinculados</h3><div className="g-chips">{(data.prod||[]).map((p)=><span className="g-chip" key={p}>{p}</span>)}</div></section><aside className="g-detail"><div className="g-kv"><div><small>Tipo</small><b>{data.tp}</b></div><div><small>Ubicación</small><b>{data.m}</b></div><div><small>Horario</small><b>{data.h||'No especificado'}</b></div><div><small>Registros relacionados</small><b>{data.rel??'—'}</b></div></div>{data.address && <p className="g-p">{data.address}</p>}{data.coordinates && <p className="g-p">Coordenadas publicadas: {data.coordinates[1]}, {data.coordinates[0]}</p>}<SourceNote record={data}/></aside></div><PublicRelations record={data}/></> : <div className="empty-state">No se encontró el mercado. <Link to="/mercados">Volver al catálogo</Link></div>}</Loading>;
}
