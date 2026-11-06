"use client";
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,BookOpen,CalendarDays,MapPin,RotateCcw,X} from 'lucide-react';
import {Sheet,SheetClose,SheetContent,SheetDescription,SheetHeader,SheetTitle,SheetTrigger} from '@/components/ui/sheet';
import {useDashboard} from '@/components/dashboard/dashboard-context';
import {categoryLabels,municipalityLabels,type CategoryFilter} from '@/lib/dashboard-view';
import {chartCategories} from './interactive-charts';
import styles from './records-total-card.module.css';
const format=(value:number)=>value.toLocaleString('es-MX');
function AnimatedCount({value}:{value:number}){
 const [display,setDisplay]=useState(0);const current=useRef(0);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const from=current.current;
  let frame=0;let start:number|undefined;
  const tick=(time:number)=>{start??=time;const progress=media.matches?1:Math.min((time-start)/550,1);const eased=1-Math.pow(1-progress,3);const next=Math.round(from+(value-from)*eased);current.current=next;setDisplay(next);if(progress<1)frame=window.requestAnimationFrame(tick);};
  frame=window.requestAnimationFrame(tick);
  return()=>window.cancelAnimationFrame(frame);
 },[value]);
 return <><span aria-hidden="true">{format(display)}</span><span className="sr-only">{format(value)}</span></>;
}
export function RecordsTotalCard(){
 const {view,filters,setFilter}=useDashboard();const [open,setOpen]=useState(false);const [hovered,setHovered]=useState<number|null>(null);
 const total=view.distributionTotal;
 const period=filters.period==='2024'?'Ene – May 2024':filters.period==='2023'?'Ene – Dic 2023':'Ene 2023 – May 2024';
 const points=view.records;const min=Math.min(...points.map(point=>point.records));const max=Math.max(...points.map(point=>point.records));
 const coordinates=points.map((point,index)=>({x:4+(index*88/Math.max(1,points.length-1)),y:33-((point.records-min)/Math.max(1,max-min))*26}));
 const path=coordinates.map((point,index)=>`${index?'L':'M'}${point.x},${point.y}`).join(' ');
 const active=hovered===null?null:points[hovered];const activePoint=hovered===null?null:coordinates[hovered];
 return <Sheet open={open} onOpenChange={setOpen}><article className={styles.card}><SheetTrigger asChild><button type="button" className={styles.trigger} aria-label={`Explorar registros totales: ${format(total)} registros`} onPointerLeave={()=>setHovered(null)}>
 <span className={styles.top}><span>Registros totales</span><span className={styles.icon}><BookOpen size={17}/></span></span>
 <span className={styles.value}><AnimatedCount value={total}/></span>
 <span className={styles.bottom}><span className={styles.explore}>Explorar categorías<ArrowRight size={13}/></span><span className={styles.spark} onPointerMove={event=>{const box=event.currentTarget.getBoundingClientRect();const position=(event.clientX-box.left)/box.width;setHovered(Math.max(0,Math.min(points.length-1,Math.round(position*(points.length-1)))));}} onPointerLeave={()=>setHovered(null)}>
 <svg viewBox="0 0 96 38" aria-hidden="true"><path d={`${path} L92,38 L4,38 Z`} fill="#033AA50c"/><path className={styles.sparkLine} pathLength={1} d={path} fill="none" stroke="#033AA5" strokeWidth="2" strokeLinecap="round"/>{activePoint&&<><line x1={activePoint.x} x2={activePoint.x} y1="1" y2="38" stroke="#2789D1" strokeDasharray="2 2"/><circle cx={activePoint.x} cy={activePoint.y} r="3" fill="#033AA5" stroke="white" strokeWidth="1"/></>}</svg>
 {active&&<span className={styles.sparkTip} role="tooltip">{active.month}<strong>{format(active.records)} acumulados</strong></span>}
 </span></span></button></SheetTrigger></article>
 <SheetContent className={styles.panel} showCloseButton={false}><SheetHeader className={styles.header}><span className={styles.kicker}><BookOpen size={14}/>EXPLORAR EL ACERVO</span><SheetTitle>Registros totales</SheetTitle><SheetDescription>Consulta el desglose y elige una categoría para explorar el resumen.</SheetDescription><SheetClose className={styles.close} aria-label="Cerrar detalle de registros"><X size={18}/></SheetClose></SheetHeader>
 <div className={styles.scroll}><div className={styles.summary}><p>Registros en esta selección</p><strong><AnimatedCount value={total}/></strong><div className={styles.context}><span><CalendarDays size={12}/>{period}</span><span><MapPin size={12}/>{municipalityLabels[filters.municipality]??'Todos los municipios'}</span></div></div>
 <div className={styles.categoryFilter}><label htmlFor="records-category">Categoría</label><select id="records-category" value={filters.category} onChange={event=>setFilter('category',event.target.value as CategoryFilter)}>{Object.entries(categoryLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></div>
 <div className={styles.breakdownHeading}><h3>Desglose de la selección</h3><span>{view.distribution.length} {view.distribution.length===1?'categoría':'categorías'}</span></div>
 <ul className={styles.breakdown}>{view.distribution.map(item=>{const color=chartCategories.find(category=>category.key===item.key)?.color??'#033AA5';return <li key={item.key}><button type="button" aria-label={filters.category===item.key?`Quitar filtro de ${item.name}`:`Explorar ${item.name}`} onClick={()=>setFilter('category',filters.category===item.key?'todas':item.key)}><span className={styles.row}><i style={{background:color}}/><span>{item.name}</span><strong>{format(item.value)}</strong><ArrowRight size={14}/></span><span className={styles.bar} aria-hidden="true"><span style={{width:`${total?item.value/total*100:0}%`,background:color}}/></span><span className={styles.share}>{total?(item.value/total*100).toLocaleString('es-MX',{maximumFractionDigits:1}):0}% de la selección</span></button></li>;})}</ul>
 <p className={styles.note}>Los cambios se aplican al resumen mientras exploras. El periodo y el municipio se conservan.</p>
 </div><footer className={styles.footer}>{filters.category!=='todas'&&<button type="button" onClick={()=>setFilter('category','todas')}><RotateCcw size={13}/>Todas las categorías</button>}<SheetClose className={styles.done}>Volver al resumen<ArrowRight size={14}/></SheetClose></footer>
 </SheetContent></Sheet>;
}
