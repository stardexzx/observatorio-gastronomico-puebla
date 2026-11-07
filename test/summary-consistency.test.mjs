import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const compiled = `${root}work/summary-consistency-${process.pid}.mjs`;
await mkdir(`${root}work`, { recursive: true });
const { outputFiles } = await build({
  stdin: {
    contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { SessionProvider } from '@/components/auth/session-provider';
      import { DashboardProvider, useDashboard } from '@/components/dashboard/dashboard-context';
      function Probe() {
        const { view, filters, allDistribution, municipalityCounts, error, isLoading } = useDashboard();
        return <pre>{JSON.stringify({view,filters,allDistribution,municipalityCounts,error,isLoading})}</pre>;
      }
      export function summaryFor(catalog, user) {
        globalThis.__testSummaryCatalog = catalog;
        return renderToStaticMarkup(<SessionProvider user={user}><DashboardProvider><Probe/></DashboardProvider></SessionProvider>);
      }
    `,
    resolveDir: root, sourcefile: 'summary-consistency-fixture.tsx', loader: 'tsx',
  },
  absWorkingDir: root, bundle: true, format: 'esm', platform: 'node', write: false,
  alias: { '@': root }, external: ['react', 'react-dom/server'],
  plugins: [{ name: 'published-catalog-fixture', setup(build) {
    build.onResolve({ filter: /^@\/components\/public\/public-catalog-provider$/ }, () => ({path:'catalog',namespace:'summary-fixture'}));
    build.onLoad({filter:/.*/,namespace:'summary-fixture'}, () => ({contents:'export const usePublicCatalog = () => globalThis.__testSummaryCatalog;',loader:'js'}));
  }}],
});
await writeFile(compiled, outputFiles[0].contents);
const { summaryFor } = await import(pathToFileURL(compiled).href);
await unlink(compiled);
const admin = {id:'admin-test',name:'Equipo',email:'summary@invalid.example',role:'administrador'};
const base = {recipes:[],ingredients:[],cooks:[],loading:false,error:'',reload:()=>{}};

test('a published catalog has the same real summary before and after login', () => {
  const catalog = {...base,recipes:[{id:'r1',name:'Ficha publicada',municipalityCode:'21114',publishedAt:'2026-03-02T10:00:00Z'}]};
  const publicSummary = summaryFor(catalog,null);
  assert.equal(summaryFor(catalog,admin),publicSummary);
  assert.match(publicSummary,/&quot;distributionTotal&quot;:1/);
  assert.doesNotMatch(publicSummary,/1246|1,246/);
  assert.match(publicSummary,/&quot;period&quot;:&quot;todos&quot;/);
});

test('an empty or unavailable published catalog does not become sample data after login', () => {
  const empty = summaryFor(base,null);
  assert.equal(summaryFor(base,admin),empty);
  assert.match(empty,/&quot;distributionTotal&quot;:0/);
  const failed = {...base,error:'Consulta no disponible'};
  assert.equal(summaryFor(failed,admin),summaryFor(failed,null));
  assert.match(summaryFor(failed,admin),/Consulta no disponible/);
});
