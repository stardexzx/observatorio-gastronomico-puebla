import { Link, useParams } from 'react-router-dom';
import { getPublicRecord, usesDatabase } from '../services/api.js';
import useRemoteData from './useRemoteData.js';
import { Loading, PageHeader } from './CatalogPage.jsx';
import { PublicRelations, SourceNote } from '../components/catalog/PublicDetails.jsx';
const https = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
export default function FichaPublica() {
  const { id } = useParams();
  const { loading, data, error } = useRemoteData(() => usesDatabase ? getPublicRecord(id) : Promise.resolve(null), [id]);
  return <Loading loading={loading} error={error}>{data ? <>
    <PageHeader title={data.n} description={data.p}/><section className="g-card public-body">
      <p className="g-p">{data.d || 'Sin descripción pública.'}</p>{data.purpose && <p className="g-p">{data.purpose}</p>}
      {!!data.links?.length && <><h3>Escucha este episodio</h3><div className="g-chips">{data.links.filter(l => https(l.url)).map(l => <a className="g-btn" key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">{l.plataforma} ↗</a>)}</div></>}
      {data.archivos?.filter(a => a.tipo_mime?.startsWith('audio/') && https(a.url)).map(a => <figure key={a.id}><figcaption>{a.nombre}</figcaption><audio controls preload="none" src={a.url}/><p className="foot-note">{a.credito} · {a.licencia}</p></figure>)}
      {data.transcript && <details><summary>Leer transcripción</summary><p className="g-p">{data.transcript}</p></details>}
      {!!data.credits?.length && <><h3>Créditos</h3>{data.credits.map((c, i) => <p className="g-p" key={i}>{c.nombre} · {c.funcion}</p>)}</>}
      {!!data.fu?.length && <><h3>Fuentes</h3>{data.fu.map((s, i) => <p className="g-p" key={i}>{s}</p>)}</>}
      <SourceNote record={data}/></section><PublicRelations record={data}/>
    </> : <div className="empty-state">No se encontró una ficha pública. <Link to="/">Volver al inicio</Link></div>}</Loading>;
}
