import Icon from '../../assets/icons.jsx';
const categories = [
  ['ingrediente', 'Ingredientes publicados', 'leaf', '#4F7A4A'],
  ['receta', 'Recetas históricas', 'recipe', '#C1531E'],
  ['mercado', 'Mercados y tianguis', 'stall', '#D89A2E'],
  ['persona', 'Cocineras y cocineros', 'person', '#10284C'],
  ['instrumento', 'Protecciones legales', 'shield', '#C1531E'],
];
export function publicCategories(counts = {}) {
  return categories.map(([key, name, , color]) => ({name, value:Number(counts[key] || 0),color}));
}
export default function PublicKpis({ data }) {
  const items = [...categories.map(([key,label,icon,color]) => ({label,icon,color,value:data.counts[key] || 0})), {label:'Municipios documentados',icon:'pin',color:'#D89A2E',value:data.municipios}];
  return <div className="g-kpis">{items.map(k => <div className="g-kpi" key={k.label}><span className="g-dot" style={{width:40,height:40,background:k.color}}><Icon name={k.icon} size={21}/></span><b>{Number(k.value).toLocaleString('es-MX')}</b><small>{k.label}</small><em>Contenido publicado</em></div>)}</div>;
}
export function LegalKpis({ data }) {
  const date = data.actualizado ? new Date(data.actualizado + 'T12:00:00Z').toLocaleDateString('es-MX',{timeZone:'UTC'}) : 'Sin publicaciones';
  const items = [
    ['Protecciones activas',data.activos,'shield','#10284C'],
    ['Expedientes en trámite',data.expedientes,'folder','#E8963C'],
    ['Recetas protegidas',data.recetas,'recipe','#C1531E'],
    ['Municipios cubiertos',data.municipios,'building','#D89A2E'],
    ['Última publicación',date,'calendar','#2E8A82'],
  ];
  return <div className="g-kpis c5">{items.map(([label,value,icon,color]) => <div className="g-kpi" key={label}><span className="g-dot" style={{width:40,height:40,background:color}}><Icon name={icon} size={21}/></span>{typeof value === 'number' ? <b>{value}</b> : <small>{value}</small>}<small>{label}</small></div>)}</div>;
}
