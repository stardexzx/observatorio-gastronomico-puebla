import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const {outputFiles}=await build({entryPoints:[`${root}lib/dashboard-view.ts`],absWorkingDir:root,bundle:true,format:'esm',platform:'node',write:false,alias:{'@':root}});
const {buildDashboardView,defaultFilters}=await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
test('all temporal charts respect the selected year without leaking points from another year',()=>{
 for(const period of ['2023','2024']){
  const view=buildDashboardView({...defaultFilters,period});
  for(const series of [view.growth,view.records,view.coverage,view.verification]){
   assert.ok(series.length>0);assert.ok(series.every(point=>point.month.endsWith(period.slice(-2))));
  }
 }
 assert.equal(buildDashboardView({...defaultFilters,period:'2023'}).growth.length,3);
 assert.equal(buildDashboardView({...defaultFilters,period:'2024'}).growth.length,2);
});
test('category drilldown totals agree with the full composition and preserve municipal context',()=>{
 for(const municipality of ['todos','21114','21019']){
  const filters={...defaultFilters,municipality};const full=buildDashboardView(filters);
  for(const item of full.distribution){
   const selected=buildDashboardView({...filters,category:item.key});
   assert.equal(selected.distribution.length,1);assert.equal(selected.distributionTotal,item.value);
   assert.equal(selected.categoryOnly,item.key);assert.ok(selected.records.at(-1).records<=full.records.at(-1).records);
  }
 }
});
