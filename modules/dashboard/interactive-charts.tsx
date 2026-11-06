"use client";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RotateCcw, Table2 } from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { buildDashboardView, categoryLabels, type CategoryFilter } from "@/lib/dashboard-view";
import styles from "./interactive-charts.module.css";
export const chartCategories=[
 {key:'recetas',label:'Recetas',color:'#033AA5'},
 {key:'ingredientes',label:'Ingredientes',color:'#2789D1'},
 {key:'mercados',label:'Mercados',color:'#FFBF18'},
 {key:'cocineras',label:'Cocineras/os',color:'#EF703C'},
 {key:'legal',label:'Protección legal',color:'#D58B20'},
] as const;
type ChartKey=typeof chartCategories[number]['key'];
const tooltipStyle={borderRadius:10,border:'1px solid #A9D2ED',fontSize:11,background:'#fff',boxShadow:'0 5px 20px #001B6210'};
const format=(value:number)=>value.toLocaleString('es-MX');
export function GrowthExplorer(){
 const {filters}=useDashboard();
 return <GrowthExplorerView key={filters.period}/>;
}
function GrowthExplorerView(){
 const {view,filters}=useDashboard();
 const [shown,setShown]=useState<ChartKey[]>(chartCategories.map(item=>item.key));
 const [from,setFrom]=useState(0);const [to,setTo]=useState(view.growth.length-1);
 const [linesOnly,setLinesOnly]=useState(false);const [table,setTable]=useState(false);
 const available=chartCategories.filter(item=>filters.category==='todas'||item.key===filters.category);
 const visible=available.filter(item=>shown.includes(item.key));
 // A global category selection must remain visible even when it was hidden locally.
 const active=visible.length?visible:available;
 const data=view.growth.slice(from,to+1);
 const toggle=(key:ChartKey)=>setShown(current=>active.some(item=>item.key===key)?current.filter(item=>item!==key):[...current,key]);
 return <div className={styles.explorer}><div className={styles.legend} role="group" aria-label="Categorías visibles en crecimiento">{available.map(item=>{const pressed=active.some(line=>line.key===item.key);return <button type="button" key={item.key} aria-pressed={pressed} disabled={pressed&&active.length===1} onClick={()=>toggle(item.key)} title={pressed?'Ocultar categoría':'Mostrar categoría'}><i style={{background:item.color}}/>{item.label}</button>;})}</div>
 <div className={styles.controls}><div className={styles.dates}><label>Desde<select aria-label="Inicio del tramo del gráfico" value={from} onChange={event=>{const next=Number(event.target.value);setFrom(next);if(next>to)setTo(next);}}>{view.growth.map((point,index)=><option key={point.month} value={index}>{point.month}</option>)}</select></label><label>Hasta<select aria-label="Fin del tramo del gráfico" value={to} onChange={event=>{const next=Number(event.target.value);setTo(next);if(next<from)setFrom(next);}}>{view.growth.map((point,index)=><option key={point.month} value={index}>{point.month}</option>)}</select></label></div><div className={styles.controlActions}><button type="button" aria-pressed={linesOnly} onClick={()=>setLinesOnly(value=>!value)}>{linesOnly?'Ver áreas':'Ver líneas'}</button><button type="button" aria-expanded={table} aria-controls="growth-values" onClick={()=>setTable(value=>!value)}><Table2 size={12}/>{table?'Ocultar datos':'Ver datos'}</button>{(from!==0||to!==view.growth.length-1||shown.length!==chartCategories.length)&&<button type="button" aria-label="Restablecer gráfico de crecimiento" onClick={()=>{setShown(chartCategories.map(item=>item.key));setFrom(0);setTo(view.growth.length-1);}}><RotateCcw size={12}/></button>}</div></div>
 <div className={styles.chart}><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{width:600,height:280}}><AreaChart accessibilityLayer data={data} margin={{top:18,right:12,bottom:8,left:-18}}><defs>{chartCategories.map(item=><linearGradient key={item.key} id={`growth-${item.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={item.color} stopOpacity={.2}/><stop offset="100%" stopColor={item.color} stopOpacity={.015}/></linearGradient>)}</defs><CartesianGrid vertical={false} stroke="#A9D2ED55" strokeDasharray="4 5"/><XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={12} minTickGap={20} tick={{fontSize:10,fill:'#001B6280'}}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tickMargin={8} tick={{fontSize:10,fill:'#001B6280'}}/><Tooltip contentStyle={tooltipStyle} formatter={(value,name)=>[`${Number(value).toLocaleString('es-MX')} registros`,name]} cursor={{stroke:'#2789D1',strokeDasharray:'3 4'}}/>{active.map(item=><Area key={item.key} dataKey={item.key} name={item.label} type="monotone" stroke={item.color} fill={linesOnly?'none':`url(#growth-${item.key})`} strokeWidth={2.5} animationDuration={250} dot={data.length===1?{r:4}:false} activeDot={{r:5,stroke:'#fff',strokeWidth:2}}/>)}</AreaChart></ResponsiveContainer></div>
 <p className={styles.hint}>Pulsa una categoría para comparar. En el gráfico, usa el cursor o las flechas del teclado.</p>
 {table&&<div id="growth-values" className={styles.dataTable}><table><caption>Valores del tramo seleccionado</caption><thead><tr><th scope="col">Periodo</th>{active.map(item=><th key={item.key} scope="col">{item.label}</th>)}</tr></thead><tbody>{data.map(point=><tr key={point.month}><th scope="row">{point.month}</th>{active.map(item=><td key={item.key}>{format(point[item.key])}</td>)}</tr>)}</tbody></table></div>}
 </div>;
}
export function CompositionExplorer(){
 const {view,filters,setFilter}=useDashboard();
 // Keep the full breakdown as context while a category filters the rest of the panel.
 const distribution=buildDashboardView({...filters,category:'todas'}).distribution;
 const total=distribution.reduce((sum,item)=>sum+item.value,0);
 const selected=distribution.find(item=>item.key===filters.category);
 const choose=(key:ChartKey)=>setFilter('category',filters.category===key?'todas':key);
 return <div className={styles.composition}><div className={styles.donut}><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{width:260,height:190}}><PieChart accessibilityLayer><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={64} outerRadius={85} paddingAngle={3} cornerRadius={4} stroke="none" animationDuration={250} onClick={(_,index)=>choose(distribution[index].key)} style={{cursor:'pointer'}}>{distribution.map(item=><Cell key={item.key} fill={chartCategories.find(category=>category.key===item.key)?.color} fillOpacity={!selected||selected.key===item.key?1:.22}/>)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value,name)=>[`${format(Number(value))} registros · ${total?(Number(value)/total*100).toFixed(1):'0.0'}%`,name]}/></PieChart></ResponsiveContainer><div className={styles.donutCenter}><strong>{format(selected?.value??total)}</strong><span>{selected?.name??'Total del acervo'}</span></div></div>
 <div className={styles.compositionLegend} role="group" aria-label="Filtrar resumen por categoría">{distribution.map(item=><button key={item.key} type="button" aria-pressed={filters.category===item.key} aria-label={`Filtrar por ${item.name}`} onClick={()=>choose(item.key)}><i style={{background:chartCategories.find(category=>category.key===item.key)?.color}}/><span>{item.name}</span><strong>{format(item.value)}</strong><small>{total?(item.value/total*100).toFixed(1):'0.0'}%</small></button>)}</div><p className={styles.hint}>Pulsa un segmento o una categoría para filtrar el resumen.</p>{filters.category!=='todas'&&<button type="button" className={styles.clear} onClick={()=>setFilter('category','todas')}><RotateCcw size={12}/>Ver todas las categorías</button>}<span className="sr-only" role="status">{view.categoryOnly?`Resumen filtrado por ${categoryLabels[view.categoryOnly]}`:'Todas las categorías'}</span></div>;
}
export function DashboardSelection(){
 const {filters,setFilter,resetFilters}=useDashboard();
 if(filters.category==='todas'&&filters.municipality==='todos')return null;
 return <div className={styles.selection}><span>Vista filtrada</span>{filters.category!=='todas'&&<button type="button" onClick={()=>setFilter('category','todas')}>{categoryLabels[filters.category as CategoryFilter]} ×</button>}{filters.municipality!=='todos'&&<button type="button" onClick={()=>setFilter('municipality','todos')}>Quitar filtro municipal ×</button>}<button type="button" className={styles.clear} onClick={resetFilters}>Restablecer resumen</button></div>;
}
