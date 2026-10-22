import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import { createStore } from '../server/database.mjs';
import { createApi } from '../server/app.mjs';
const database = `ogp_test_${randomBytes(8).toString('hex')}`;
const url = new URL(process.env.DATABASE_URL);
const connection = { host:url.hostname,port:Number(url.port || 5432),user:'ogp_admin',password:process.env.POSTGRES_PASSWORD };
const admin = new pg.Pool({...connection,database:'postgres'});
let owner,reader,store,server,base,created=false;
const file = name => readFile(new URL(`../${name}`,import.meta.url),'utf8');
before(async () => {
  await admin.query(`CREATE DATABASE ${database}`); created=true;
  owner=new pg.Pool({...connection,database});
  await owner.query(await file('database/observatorio_puebla.sql'));
  await owner.query(await file('database/public_api.sql'));
  await owner.query(await file('database/prueba_integridad.sql'));
  const check=await owner.query("SELECT count(*) FROM ogp.usuarios WHERE correo LIKE '%sql@invalid.example'");
  assert.equal(Number(check.rows[0].count),0,'la suite SQL revierte sus datos');
  await owner.query(await file('tests/fixtures/publications.sql'));
  url.pathname='/'+database;
  reader=new pg.Pool({connectionString:url.toString()});
  store=createStore(url.toString());server=createApi(store);
  server.listen(0,'127.0.0.1');await once(server,'listening');
  base=`http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if(server) await new Promise(resolve=>server.close(resolve));
  if(store) await store.close();
  if(reader) await reader.end();
  if(owner) await owner.end();
  if(created) await admin.query(`DROP DATABASE ${database} WITH (FORCE)`);
  await admin.end();
});
const get = async path => {const response=await fetch(base+'/api/'+path);assert.equal(response.status,200,path);return response.json();};
test('la API usa un rol sin acceso a tablas privadas ni funciones editoriales',async()=>{
  await assert.rejects(reader.query('SELECT * FROM ogp.persona_datos_restringidos'),e=>e.code==='42501');
  await assert.rejects(reader.query('SELECT ogp.publicar_revision(NULL,NULL)'),e=>e.code==='42501');
  assert.equal((await get('health')).status,'ok');
});
test('catálogos y detalles adaptan los snapshots públicos al frontend',async()=>{
  for(const [resource,title] of [['recetas','Receta de integración'],['mercados','Mercado de integración'],['cocineras','Persona de integración'],['proteccion-legal','Instrumento de integración']]) {
    const list=await get(resource);assert.equal(list.items.length,1);assert.equal(list.items[0].n,title);
    const detail=await get(`${resource}/${list.items[0].id}`);assert.equal(detail.n,title);assert.equal(detail.source,'database');
  }
  const recipe=(await get('recetas')).items[0];
  assert.equal(recipe.ing[0][0],'Chile sintético');assert.equal(recipe.steps[0].instrucciones,'Preparar el ingrediente sintético.');
  const market=(await get('mercados')).items[0];assert.deepEqual(market.coordinates,[-98.2,19.04]);assert.match(market.h,/08:00/);
});
test('búsqueda, paginación, mapa, indicadores, podcasts y grafo consultan PostgreSQL',async()=>{
  const search=await get('buscar?q=receta');assert.ok(search.items.some(r=>r.n==='Receta de integración'));
  const first=await get('buscar?limit=2'),next=await get('buscar?limit=2&offset=2');
  assert.equal(first.items.length,2);assert.equal(first.hasMore,true);assert.ok(!next.items.some(r=>first.items.some(a=>a.id===r.id)));
  const map=await get('mapa');assert.equal(map.features.length,1);assert.deepEqual(map.features[0].geometry.coordinates,[-98.2,19.04]);
  const panel=await get('reportes');assert.equal(panel.total,9);assert.equal(panel.counts.receta,1);assert.equal(panel.municipios,1);
  assert.equal(panel.legal.activos,1);assert.equal(panel.legal.expedientes,0);
  assert.equal((await get('podcasts')).items[0].n,'Serie de integración');
  assert.equal((await get('episodios')).items[0].links[0].plataforma,'Página de prueba');
  const graph=await get('red-conocimiento');assert.ok(graph.edges.length>=3);assert.ok(graph.nodes.some(n=>n.n==='Chile sintético'));
});
test('los borradores y los datos privados no salen por búsquedas ni detalles',async()=>{
  const result=await get('buscar?q=BORRADOR');assert.equal(result.items.length,0);
  const drafts=await owner.query("SELECT id FROM ogp.ingredientes WHERE nombre='BORRADOR NO PUBLICADO'");
  assert.equal((await fetch(base+'/api/registros/'+drafts.rows[0].id)).status,404);
  const output=JSON.stringify(await get('cocineras'));
  for(const secret of ['private@invalid.example','555-PRIVATE','NOTAS PRIVADAS','CONSENTIMIENTO PRIVADO']) assert.ok(!output.includes(secret));
});
test('el frontend conserva navegación y renderiza datos publicados en Chromium',{skip:process.env.OGP_BROWSER_TESTS!=='1'},async()=>{
  const {createServer:createVite}=await import('vite');
  const vite=await createVite({server:{host:'127.0.0.1',port:0,proxy:{'/api':base}}});
  try {
    await vite.listen();
    const result=await promisify(execFile)('python',['tests/browser_smoke.py',`http://127.0.0.1:${vite.httpServer.address().port}`],{timeout:60000});
    console.log(result.stdout);
  } finally {await vite.close();}
});
test('retirar una dependencia obligatoria oculta la receta en todos los endpoints',async()=>{
  const {rows}=await owner.query("SELECT r.creado_por,p.id FROM ogp.preparaciones p JOIN ogp.registros r ON r.id=p.id WHERE nombre='Preparación de integración'");
  await owner.query("SELECT ogp.retirar_publicacion($1,$2,'Retiro sintético')",[rows[0].creado_por,rows[0].id]);
  assert.equal((await get('recetas')).items.length,0);assert.equal((await get('buscar?q=receta')).items.length,0);
  assert.equal((await get('reportes')).counts.receta,undefined);
});
test('revocar un consentimiento retira la ficha pública de la persona',async()=>{
  const person=(await get('cocineras')).items[0];
  const {rows}=await owner.query('SELECT id,creado_por FROM ogp.consentimientos WHERE persona_id=$1',[person.id]);
  await owner.query('SELECT ogp.revocar_consentimiento($1,$2)',[rows[0].creado_por,rows[0].id]);
  assert.equal((await get('cocineras')).items.length,0);
  assert.equal((await fetch(base+'/api/cocineras/'+person.id)).status,404);
});
