import React from 'react';
const MONTHS = ['Ene 2023','May 2023','Sep 2023','Ene 2024','May 2024'];
export default function LineChart({ chart }) {
  if (!chart) return null;
  const W=720,H=270,L=46,R=30,T=18,B=34,iw=W-L-R,ih=H-T-B;
  const labels=chart.labels || MONTHS, last=Math.max(0,labels.length-1);
  const x=i => L+i*iw/Math.max(1,last); const y=v => T+ih-v/Math.max(1,chart.max)*ih;
  return <div><svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={chart.sub}>
    {chart.ticks.map(t => <g key={t}><line x1={L} x2={W-R} y1={y(t)} y2={y(t)} stroke="#E3E7EE" /><text x={L-8} y={y(t)+4} textAnchor="end" fontSize="11" fill="#7C8798">{t}{chart.unit}</text></g>)}
    {labels.map((m,i)=><text key={m} x={x(i)} y={H-10} textAnchor="middle" fontSize="11" fill="#7C8798">{m}</text>)}
    {chart.s.map(series => { const pts=series.v.map((v,i)=>`${x(i)},${y(v)}`).join(' '); return <g key={series.n}>{chart.area ? <polygon points={`${x(0)},${y(0)} ${pts} ${x(last)},${y(0)}`} fill={series.c} opacity=".09" /> : null}<polyline points={pts} fill="none" stroke={series.c} strokeWidth="2.5" strokeLinejoin="round" />{series.v.map((v,i)=><circle key={i} cx={x(i)} cy={y(v)} r="4" fill="#fff" stroke={series.c} strokeWidth="2" />)}{chart.s.length===1 && <text x={x(last)} y={y(series.v[last])-11} textAnchor="middle" fontSize="12" fontWeight="800" fill={series.c}>{series.v[last].toLocaleString('en-US')}{chart.unit}</text>}</g>; })}
  </svg>
  {chart.s.length>1 && <div className="g-lgd">{chart.s.map(s=><span key={s.n}><i style={{background:s.c}} />{s.n}</span>)}</div>}
  </div>;
}
