import React from 'react';
export default function DonutChart({ categories = [], total = categories.reduce((sum,c)=>sum+c.value,0) }) {
  const radius=64, circumference=2*Math.PI*radius;
  const segments=categories.map((category,index)=>({
    category,
    length:category.value/(total || 1)*circumference,
    offset:categories.slice(0,index).reduce((sum,item)=>sum+item.value,0)/(total || 1)*circumference,
  }));
  return <div className="g-donut"><svg viewBox="0 0 180 180" width="190" height="190" role="img" aria-label="Distribución de los registros por categoría">
    {!total && <circle r={radius} cx="90" cy="90" fill="none" stroke="#E3E7EE" strokeWidth="26"/>}
    {segments.map(({category,length,offset})=><circle key={category.name} r={radius} cx="90" cy="90" fill="none" stroke={category.color} strokeWidth="26" strokeDasharray={`${length} ${circumference-length}`} strokeDashoffset={-offset} transform="rotate(-90 90 90)" />)}
    <text x="90" y="88" textAnchor="middle" fontSize="24" fontWeight="800" fill="#10284C">{total.toLocaleString('en-US')}</text><text x="90" y="106" textAnchor="middle" fontSize="11" fill="#7C8798">Total</text>
  </svg><div className="g-dl">{categories.map(c=><div key={c.name}><span><i style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:c.color,marginRight:8}} />{c.name}</span><b>{c.value} ({(c.value/(total || 1)*100).toFixed(1)}%)</b></div>)}</div></div>;
}
