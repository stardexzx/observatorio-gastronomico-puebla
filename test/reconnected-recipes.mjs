import assert from 'node:assert/strict';
import pg from 'pg';
const sessionCookie=process.env.TEST_SESSION_COOKIE;
if(!sessionCookie)throw new Error('Esta prueba requiere TEST_SESSION_COOKIE de una sesión autenticada. Para probar el flujo completo sin una cuenta propia, ejecuta test/auth-flow.mjs.');
const authenticatedFetch=(url,options={})=>globalThis.fetch(url,{...options,headers:{Cookie:sessionCookie,...options.headers}});
const origin=process.env.TEST_ORIGIN??'http://localhost:5173';
const headers={'Content-Type':'application/json',Origin:origin};
const url=path=>`${origin}${path}`;
const json=async(path,options)=>{const response=await authenticatedFetch(url(path),options);const body=await response.json();assert.ok(response.ok,`HTTP ${response.status}: ${body.error??'error'}`);return body;};
const pixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1sAAAAASUVORK5CYII=';
const wave=Buffer.alloc(46);wave.write('RIFF');wave.writeUInt32LE(38,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(8000,24);wave.writeUInt32LE(16000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(2,40);
const list=await json('/api/recipes');assert.ok(Array.isArray(list.recipes));assert.equal('database' in list,false);
let id;
try{
 const created=await json('/api/recipes',{method:'POST',headers,body:JSON.stringify({name:`Comprobación de conexión · ${Date.now()}`,municipality:'Puebla',municipalityCode:'21114',region:'Angelópolis',category:'Guiso',description:'Ficha sintética para comprobar el guardado.',source:'Publicación',sourceReference:'Referencia de prueba',sourceUrl:'https://example.org/fuente',consultationDate:'2026-10-29',steps:['Paso de prueba'],photos:[{id:'test-photo',name:'prueba.png',type:'image/png',size:Buffer.from(pixel,'base64').length,url:`data:image/png;base64,${pixel}`,caption:'Imagen de prueba'}],audio:[{id:'test-audio',name:'prueba.wav',type:'audio/wav',size:wave.length,url:`data:audio/wav;base64,${wave.toString('base64')}`,caption:'Audio de prueba'}]})});
 id=created.recipe.id;
 assert.match(id,/^[a-f0-9-]{36}$/i);
 const edited=await json(`/api/recipes/${id}`,{method:'PUT',headers,body:JSON.stringify({...created.recipe,description:'Descripción actualizada.',status:'in-review'})});
 assert.equal(edited.recipe.status,'in-review');
 const {recipe}=await json(`/api/recipes/${id}`);
 assert.equal(recipe.description,'Descripción actualizada.');assert.equal(recipe.sourceUrl,'https://example.org/fuente');assert.equal(recipe.consultationDate,'2026-10-29');assert.equal(recipe.photos[0].caption,'Imagen de prueba');assert.equal(recipe.audio[0].caption,'Audio de prueba');assert.equal(recipe.steps[0],'Paso de prueba');
 const invalid=await authenticatedFetch(url(`/api/recipes/${id}`),{method:'PUT',headers,body:JSON.stringify({...recipe,photos:[{...recipe.photos[0],url:'javascript:alert(1)'}]})});assert.equal(invalid.status,400);
 assert.equal((await json(`/api/recipes/${id}`)).recipe.photos[0].url,recipe.photos[0].url);
 const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
 try{const {rows:[row]}=await db.query('SELECT form FROM demo.recipe_forms WHERE receta_id=$1',[id]);assert.equal(row.form.sourceUrl,recipe.sourceUrl);assert.equal(row.form.audio.length,1);}finally{await db.end();}
 console.log('OK: lectura, creación, edición, enlace de fuente, fecha, pasos, adjuntos, estado y persistencia; validación sin sobrescribir datos.');
}finally{
 if(id){await json(`/api/recipes/${id}`,{method:'DELETE',headers});const response=await authenticatedFetch(url(`/api/recipes/${id}`));assert.equal(response.status,404);const after=await json('/api/recipes');assert.ok(!after.recipes.some(recipe=>recipe.id===id));console.log('OK: archivo de la ficha sintética y ausencia en catálogo y editor.');}
}
