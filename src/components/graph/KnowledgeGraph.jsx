import { Link } from 'react-router-dom';
import React, { useEffect, useMemo, useRef, useState } from 'react';
const COLORS = { ing:'#4F7A4A', rec:'#C1531E', mer:'#D89A2E', coc:'#10284C', leg:'#B23A1F', mun:'#3E6FA8' };
export default function KnowledgeGraph({ graph }) {
  const svgRef=useRef(null); const dragRef=useRef(null); const [selected,setSelected]=useState('mole'); const [positions,setPositions]=useState({});
  useEffect(()=>{ if(graph?.nodes) setPositions(Object.fromEntries(graph.nodes.map(n=>[n.id,{x:n.x,y:n.y}]))); },[graph]);
  useEffect(()=>{
    const move=(event)=>{ if(!dragRef.current||!svgRef.current)return; const rect=svgRef.current.getBoundingClientRect(); const p=dragRef.current; const x=(event.clientX-rect.left)/rect.width*760, y=(event.clientY-rect.top)/rect.height*480; setPositions(current=>({...current,[p.id]:{x:p.x+(x-p.startX),y:p.y+(y-p.startY)}})); };
    const up=()=>{dragRef.current=null;};
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
    return ()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};
  },[]);
  const nodes=graph?.nodes||[]; const edges=graph?.edges||[]; const byId=useMemo(()=>Object.fromEntries(nodes.map(n=>[n.id,n])),[nodes]);
  if(!nodes.length) return <div className="empty-state">No hay nodos para mostrar.</div>;
  const pos=(id)=>positions[id]||byId[id];
  return <div className="g-graph"><svg ref={svgRef} className="g-graph-svg" viewBox="0 0 760 480" onPointerLeave={()=>{}}>
    <defs><marker id="ogp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#B8C2D4"/></marker></defs>
    {edges.map((edge,i)=>{const a=pos(edge.source),b=pos(edge.target); return a&&b?<g key={i}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#B8C2D4" strokeWidth="1.2" markerEnd="url(#ogp-arrow)"/><text x={(a.x+b.x)/2} y={(a.y+b.y)/2-3} fontSize="8" fill="#6B7A99" textAnchor="middle" paintOrder="stroke" stroke="#fff" strokeWidth="3">{edge.type}</text></g>:null;})}
    {nodes.map(node=>{const p=pos(node.id);return <g key={node.id} transform={`translate(${p.x},${p.y})`} style={{cursor:'grab',touchAction:'none'}} onPointerDown={event=>{event.preventDefault();dragRef.current={id:node.id,x:p.x,y:p.y,startX:(event.clientX-svgRef.current.getBoundingClientRect().left)/svgRef.current.getBoundingClientRect().width*760,startY:(event.clientY-svgRef.current.getBoundingClientRect().top)/svgRef.current.getBoundingClientRect().height*480};setSelected(node.id);}}><circle r={node.r} fill={COLORS[node.t]||'#10284C'} stroke={selected===node.id?'#D89A2E':'#fff'} strokeWidth={selected===node.id?4:2.5}/><text y={node.r+14} textAnchor="middle" fontSize="10" fontWeight="700" fill="#10284C" paintOrder="stroke" stroke="#fff" strokeWidth="3">{node.n}</text></g>;})}
  </svg><div className="g-gstat"><b style={{color:'var(--navy)'}}>Estadísticas de la red</b><div><span>Nodos</span><b>{nodes.length}</b></div><div><span>Conexiones</span><b>{edges.length}</b></div></div><div className="g-tip">Selecciona o arrastra los nodos para explorar la red{byId[selected]?.to && <Link to={byId[selected].to} className="g-link"> · Ver ficha de {byId[selected].n} →</Link>}</div></div>;
}
