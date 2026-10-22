import { getReportData } from '../services/api.js';
import useRemoteData from './useRemoteData.js';
import { Loading, PageHeader } from './CatalogPage.jsx';
import PublicKpis, { publicCategories } from '../components/charts/PublicKpis.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import LineChart from '../components/charts/LineChart.jsx';
export default function ReportesPublicos() {
  const result = useRemoteData(getReportData, []);
  const data = result.data;
  const months = data?.monthly || [], max = Math.max(1, ...months.map(m => Number(m.cantidad)));
  const categories = publicCategories(data?.counts);
  const chart = { labels: months.map(m => m.mes), max, ticks: [...new Set([0,Math.ceil(max/2),max])], unit:'', area:true, sub:'Publicaciones activas por mes', s:[{n:'Publicaciones',c:'#C1531E',v:months.map(m => Number(m.cantidad))}] };
  return <><PageHeader title="Reportes y analítica" description="Indicadores calculados a partir de las versiones actualmente publicadas del Observatorio."/>
    <Loading {...result}>{data && <><PublicKpis data={data}/><div className="g-2"><section className="g-card"><div className="g-ch"><h3>Distribución del catálogo principal</h3></div><DonutChart categories={categories} total={categories.reduce((sum,c) => sum+c.value,0)}/><p className="foot-note">Incluye ingredientes, recetas, mercados, personas e instrumentos legales.</p></section><section className="g-card"><div className="g-ch"><h3>Evolución de las publicaciones</h3></div>{months.length ? <LineChart chart={chart}/> : <div className="empty-state">Aún no hay publicaciones para representar.</div>}</section></div><div className="g-card"><h3>Alcance de los datos</h3><p className="g-p">{data.total} fichas públicas en todas las colecciones. Los borradores, los contenidos retirados y los datos privados no se incluyen.</p><p className="foot-note">Puedes descargar estos indicadores desde «Descargar datos». La evolución cuenta versiones públicas activas, no un historial de todas las publicaciones.</p></div></>}</Loading>
  </>;
}
