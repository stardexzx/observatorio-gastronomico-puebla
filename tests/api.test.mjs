import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApi } from '../server/app.mjs';
async function withApi(store, check) {
  const server = createApi(store);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { await check(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('solo permite GET y rechaza UUID y paginación inválidos antes de consultar', async () => {
  await withApi({}, async url => {
    for (const [path,options,status] of [
      ['/api/recetas',{method:'POST'},405], ['/api/recetas/not-a-uuid',{},400],
      ['/api/buscar?limit=51',{},400], ['/api/buscar?offset=-1',{},400],
      ['/api/buscar?limit=NaN',{},400], ['/api/red-conocimiento?registro=bad',{},400],
      ['/api/recetas?limit=0',{},400], ['/api/inexistente',{},404],
    ]) assert.equal((await fetch(url+path,options)).status,status,path);
  });
});
test('propaga búsqueda y paginación sin convertirlas en SQL', async () => {
  let received;
  await withApi({list: async params => {received=params;return {items:[],hasMore:false};}}, async url => {
    const q="' OR 1=1; --";
    const response=await fetch(`${url}/api/recetas?${new URLSearchParams({q,limit:5,offset:10})}`);
    assert.equal(response.status,200);
    assert.deepEqual(received,{type:'receta',search:q,limit:5,offset:10});
    assert.equal(response.headers.get('cache-control'),'no-store');
  });
});
test('un detalle de otro catálogo o no publicado devuelve 404', async () => {
  await withApi({detail:async()=>({type:'mercado'})},async url=>{
    assert.equal((await fetch(url+'/api/recetas/11111111-1111-1111-1111-111111111111')).status,404);
  });
  await withApi({detail:async()=>null},async url=>{
    assert.equal((await fetch(url+'/api/registros/11111111-1111-1111-1111-111111111111')).status,404);
  });
});
test('un error de conexión no revela credenciales ni devuelve datos de demostración', async () => {
  await withApi({list:async()=>{throw new Error('postgresql://private-user:private-password@host/db');}},async url=>{
    const response=await fetch(url+'/api/recetas');
    assert.equal(response.status,503);
    const body=await response.text();
    assert.ok(!body.includes('private-'));assert.ok(!body.includes('Mole poblano'));
  });
});
