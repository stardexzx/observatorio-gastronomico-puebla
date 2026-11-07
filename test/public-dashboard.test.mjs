import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const { outputFiles } = await build({entryPoints:[`${root}lib/public-dashboard.ts`],absWorkingDir:root,bundle:true,format:'esm',platform:'node',write:false,alias:{'@':root}});
const { buildPublicDashboardView, publicSummaryYears } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
const filters = {period:'todos',municipality:'todos',category:'todas'};
const catalog = {
  recipes:[{id:'r1',name:'Uno',municipalityCode:'21114',publishedAt:'2025-05-10T10:00:00Z',description:'Preparación',source:'Archivo',sourceReference:'Referencia'},{id:'r2',name:'Dos',municipalityCode:'21019',publishedAt:'2026-03-20T10:00:00Z'}],
  ingredients:[{id:'i1',name:'Maíz',municipalityCode:'21114',publishedAt:'2026-03-22T10:00:00Z'}],
  cooks:[{id:'c1',name:'Cocinera',municipalityCode:'21114',updatedAt:'25 sep 2026'}],
};
test('public dashboard counts published catalog and municipal coverage without sample totals',()=>{
  const view = buildPublicDashboardView(catalog,filters);
  assert.equal(view.distributionTotal,4);
  assert.deepEqual(view.municipalityCounts,{'21114':3,'21019':1});
  assert.equal(view.coverage.at(-1).value,2);
  assert.equal(view.records.at(-1).records,4);
  assert.equal(view.undated,1);
  assert.equal(view.growth.at(-1).month,'Sin fecha');
  assert.equal(view.metricValues.mercados,'0');
  assert.deepEqual(publicSummaryYears(catalog),['2026','2025']);
});
test('public dashboard period, municipality and category filters agree with composition',()=>{
  const year = buildPublicDashboardView(catalog,{...filters,period:'2026'});
  assert.equal(year.distributionTotal,2);
  assert.ok(year.growth.every(point=>point.month.startsWith('2026-')));
  assert.equal(year.undated,0);
  const municipal = buildPublicDashboardView(catalog,{...filters,municipality:'21114',category:'recetas'});
  assert.equal(municipal.distributionTotal,1);
  assert.equal(municipal.allDistribution.reduce((sum,item)=>sum+item.value,0),3);
  assert.deepEqual(municipal.municipalityCounts,{'21114':1});
});
test('public dashboard empty catalog produces genuine zero and no fictitious reports or ranks',()=>{
  const empty=buildPublicDashboardView({recipes:[],ingredients:[],cooks:[]},filters);
  assert.equal(empty.distributionTotal,0);
  assert.equal(empty.metricValues.wealth,'0');
  assert.equal(empty.verified,0);
  assert.deepEqual(empty.reports,[]);
  assert.deepEqual(empty.rankings.municipios,[]);
  assert.equal(empty.records.at(-1).records,0);
  assert.equal(empty.coverage.at(-1).value,0);
});
