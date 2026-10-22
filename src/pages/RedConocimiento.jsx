import { useSearchParams } from 'react-router-dom';
import React from 'react';
import useRemoteData from './useRemoteData.js';
import { getGraphData } from '../services/api.js';
import KnowledgeGraph from '../components/graph/KnowledgeGraph.jsx';
import { Loading, PageHeader } from './CatalogPage.jsx';
export default function RedConocimiento() {
  const [params]=useSearchParams(); const focus=params.get('registro');
  const {loading,data,error}=useRemoteData(()=>getGraphData(focus),[focus]);
  if (loading) return <><PageHeader title="Red de conocimiento gastronómico" description="Relaciones entre recetas, ingredientes, mercados, cocineras y protecciones legales." /><div className="loading-state">Cargando la red de conocimiento…</div></>;
  if (error || !data) return <div className="empty-state">No fue posible cargar la red de conocimiento.</div>;
  return <><PageHeader title="Red de conocimiento gastronómico" description="Relaciones entre recetas, ingredientes, mercados, cocineras y protecciones legales." /><Loading loading={loading} error={error}><div className="g-card"><div className="g-ch"><h3>Explora las relaciones del patrimonio gastronómico</h3><span className="g-tag">Arrastra los nodos</span></div><KnowledgeGraph graph={data}/>{data.partial && <p className="foot-note">Subred de las 24 publicaciones más recientes y sus relaciones. Las fichas públicas permiten consultar cada registro.</p>}</div></Loading></>;
}
