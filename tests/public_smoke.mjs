// End-to-end checks use only disposable synthetic data in an isolated PostgreSQL container.
import {randomBytes,scryptSync} from 'node:crypto';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from 'pg';
const exec=promisify(execFile),name=`ogp_public_test_${randomBytes(5).toString('hex')}`;
const password=randomBytes(24).toString('hex');
const image='postgis/postgis:16-3.5@sha256:94146ac37bc61e2322f88016056c5920729cb8c64c8542ed590af8fc2abdac07';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const freePort=()=>new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
let container=false,server,db,log;
try{
 await mkdir('work',{recursive:true});
 await exec('docker',['run','--rm','-d','--name',name,'-e','POSTGRES_DB=observatorio_puebla_test','-e','POSTGRES_USER=ogp_admin','-e',`POSTGRES_PASSWORD=${password}`,'-p','127.0.0.1::5432',image],{timeout:60000});container=true;
 const binding=(await exec('docker',['port',name,'5432/tcp'])).stdout.trim();
 const url=new URL(`postgresql://ogp_admin@127.0.0.1:${Number(binding.split(':').at(-1))}/observatorio_puebla_test`);url.password=password;
 const env={...process.env,DATABASE_URL:url.toString(),DEMO_MODE:'true',NEXT_TELEMETRY_DISABLED:'1'};
 for(let i=0;i<60;i++){try{const c=new pg.Client({connectionString:env.DATABASE_URL});await c.connect();await c.end();break;}catch(error){if(i===59)throw error;await pause(1000);}}
 await exec(process.execPath,['scripts/init-unified.mjs'],{env,timeout:30000});
 await exec(process.execPath,['scripts/init-unified.mjs'],{env,timeout:30000});
 db=new pg.Client({connectionString:env.DATABASE_URL});await db.connect();
 for(const table of ['ogp.usuarios','ogp.registros','demo.recipe_forms','demo.catalog_forms','demo.public_catalog_versions','app_auth.credentials'])assert.equal((await db.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n,'0',`${table}: no catalog/account seeds`);
 assert.equal((await db.query("SELECT jsonb_array_length(content) AS n FROM demo.editorial_content WHERE key='timeline'")).rows[0].n,5);
 await db.query(await readFile('tests/fixtures/publications.sql','utf8'));
 const accounts={};
 for(const role of ['administrador','capturista','revisor']){
  const salt=randomBytes(16).toString('hex'),secret=randomBytes(24).toString('base64url'),email=`public-${role}@invalid.example`;
  const hash=`scrypt$${salt}$${scryptSync(secret,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex')}`;
  const {rows:[user]}=await db.query("INSERT INTO ogp.usuarios(nombre,correo,estado) VALUES($1,$2,'activo') RETURNING id",[`Cuenta temporal ${role}`,email]);
  await db.query('INSERT INTO app_auth.credentials(usuario_id,password_hash) VALUES($1,$2)',[user.id,hash]);
  await db.query('INSERT INTO ogp.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM ogp.roles WHERE codigo=$2',[user.id,role]);
  await db.query('INSERT INTO ogp.usuario_modulos(usuario_id,modulo) SELECT $1,codigo FROM ogp.tipos_registro',[user.id]);
  accounts[role]={email,password:secret,id:user.id};
 }
 const appPort=await freePort(),origin=`http://127.0.0.1:${appPort}`;
 log=await open('work/public-server.log','w',0o600);
 server=spawn(process.execPath,['scripts/unified-framework.mjs',process.argv.includes('--production')?'start':'dev','--port',String(appPort)],{env,stdio:['ignore',log.fd,log.fd]});
 let ready=false;
 for(let i=0;i<150;i++){try{const response=await fetch(origin+'/iniciar-sesion');if(response.status===200){ready=true;break;}}catch{}if(server.exitCode!==null)throw new Error('Next terminated; inspect work/public-server.log');await pause(1000);}
 assert.ok(ready,'Next starts');
 const get=(path,cookie)=>fetch(origin+path,{headers:cookie?{Cookie:cookie}:{},redirect:'manual'});
 const send=(path,body,cookie,method='POST',external=false)=>fetch(origin+path,{method,headers:{Origin:external?'https://example.org':origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body),redirect:'manual'});
 const catalog=async()=>{const response=await get('/api/public/catalog');assert.equal(response.status,200,await response.clone().text());return response.json();};
 for(const role of Object.keys(accounts)){const response=await send('/api/auth/login',accounts[role]);assert.equal(response.status,200);accounts[role].cookie=response.headers.get('set-cookie').split(';')[0];}
 const admin=accounts.administrador.cookie,capture=accounts.capturista.cookie,review=accounts.revisor.cookie;
 assert.equal((await get('/')).status,200,'Visitors enter the public homepage');
 assert.equal((await get('/recetas')).status,200);
 assert.equal((await get('/api/recipes')).status,401);
 assert.equal((await get('/api/catalogs/cooks')).status,401);
 let data=await catalog();
 assert.equal(data.timeline.length,5);
 assert.ok(data.recipes.some(record=>record.name==='Receta de integración'));
 assert.ok(data.cooks.some(record=>record.name==='Persona de integración'));
 assert.ok(data.ingredients.some(record=>record.name==='Chile sintético'));
 assert.ok(!JSON.stringify(data).includes('BORRADOR NO PUBLICADO'));
 for(const secret of ['NOTAS PRIVADAS','private@invalid.example','555-PRIVATE','CONSENTIMIENTO PRIVADO'])assert.ok(!JSON.stringify(data).includes(secret),secret);
 const recipe={name:'Receta pública temporal',municipality:'Puebla',municipalityCode:'21114',description:'Preparación autorizada de prueba',source:'Publicación',sourceReference:'Referencia pública temporal',ingredients:['Maíz'],steps:['Preparar el maíz.'],informant:{name:'INFORMANTE PRIVADO',role:'Testigo',municipality:'Puebla',municipalityCode:'21114',interviewDate:'2026-01-01'}};
 let response=await send('/api/recipes',recipe,capture);let body=await response.json();assert.equal(response.status,201,JSON.stringify(body));const recipeId=body.recipe.id;
 assert.ok(!(await catalog()).recipes.some(record=>record.id===recipeId));
 assert.equal((await send(`/api/catalogs/recipes/${recipeId}/publication`,{action:'publish'},capture)).status,403);
 assert.equal((await send(`/api/catalogs/recipes/${recipeId}/publication`,{action:'publish'},review,'POST',true)).status,403);
 response=await send(`/api/catalogs/recipes/${recipeId}/publication`,{action:'publish'},review);assert.equal(response.status,200,await response.clone().text());
 data=await catalog();assert.equal(data.recipes.find(record=>record.id===recipeId).name,recipe.name);assert.ok(!JSON.stringify(data).includes('INFORMANTE PRIVADO'));
 response=await send(`/api/recipes/${recipeId}`,{...recipe,name:'CAMBIO PRIVADO PENDIENTE'},capture,'PUT');assert.equal(response.status,200,await response.clone().text());
 assert.equal((await catalog()).recipes.find(record=>record.id===recipeId).name,recipe.name,'Editing draft preserves last approved snapshot');
 await send(`/api/recipes/${recipeId}`,recipe,capture,'PUT');
 response=await send('/api/recipes',{...recipe,name:'RECETA BORRADOR PRIVADO'},admin);body=await response.json();assert.equal(response.status,201,JSON.stringify(body));const draftRecipeId=body.recipe.id;
 response=await send('/api/catalogs/ingredients',{name:'Ingrediente sin origen documentado',municipalityCode:'',status:'draft'},admin);assert.equal(response.status,201,await response.clone().text());
 const ingredient={name:'Ingrediente público temporal',municipality:'Puebla',municipalityCode:'21114',description:'Ingrediente autorizado',source:'Publicación',sourceReference:'Referencia pública',status:'verified',linkedRecipes:[recipeId,draftRecipeId]};
 response=await send('/api/catalogs/ingredients',ingredient,admin);body=await response.json();assert.equal(response.status,201,JSON.stringify(body));const ingredientId=body.record.id;
 response=await send('/api/catalogs/ingredients',{...ingredient,name:'INGREDIENTE PRIVADO',status:'draft'},capture);body=await response.json();assert.equal(response.status,201);const privateIngredientId=body.record.id;
 response=await send('/api/catalogs/cooks',{name:'Persona pública temporal',municipality:'Puebla',municipalityCode:'21114',biography:'Semblanza pública autorizada',source:'Publicación',sourceReference:'Referencia pública',consent:true,status:'draft',linkedRecipes:[recipeId,draftRecipeId],linkedMarkets:['MERCADO PRIVADO'],oralHistories:[{id:'private-audio',title:'Audio privado',date:'',duration:'',url:'data:audio/mpeg;base64,SUQz'},{id:'ogg-audio',title:'OGG privado',date:'',duration:'',url:'data:audio/ogg;base64,T2dnUw=='},{id:'webm-audio',title:'WEBM privado',date:'',duration:'',url:'data:audio/webm;base64,GkXfow=='}]},capture);body=await response.json();assert.equal(response.status,201,JSON.stringify(body));const cookId=body.record.id,cook=body.record;
 assert.equal((await send(`/api/catalogs/cooks/${cookId}`,{...cook,status:'verified'},capture,'PUT')).status,403);
 response=await send(`/api/catalogs/cooks/${cookId}`,{...cook,status:'verified'},review,'PUT');assert.equal(response.status,200,await response.clone().text());
 response=await send(`/api/catalogs/ingredients/${ingredientId}`,{...ingredient},capture,'PUT');assert.equal(response.status,403,'Capture cannot edit another author record');
 response=await send('/api/catalogs/episodes',{title:'Episodio público temporal',youtubeId:'dQw4w9WgXcQ',description:'Capítulo autorizado de prueba',status:'published',recipeIds:[recipeId,draftRecipeId],ingredientIds:[ingredientId,privateIngredientId]},review);body=await response.json();assert.equal(response.status,201,JSON.stringify(body));const episodeId=body.record.id;
 data=await catalog();assert.deepEqual(data.ingredients.find(record=>record.id===ingredientId).linkedRecipes,[recipeId]);assert.deepEqual(data.cooks.find(record=>record.id===cookId).linkedRecipes,[recipeId]);assert.deepEqual(data.cooks.find(record=>record.id===cookId).linkedMarkets,[]);assert.deepEqual(data.episodes.find(record=>record.id===episodeId).recipeIds,[recipeId]);assert.deepEqual(data.episodes.find(record=>record.id===episodeId).ingredientIds,[ingredientId]);
 for(const record of [data.recipes.find(record=>record.id===recipeId),data.cooks.find(record=>record.id===cookId),data.ingredients.find(record=>record.id===ingredientId),data.episodes.find(record=>record.id===episodeId)])assert.ok(!Number.isNaN(Date.parse(record.publishedAt)));
 assert.ok(!JSON.stringify(data).includes(draftRecipeId));assert.ok(!JSON.stringify(data).includes(privateIngredientId));assert.ok(!JSON.stringify(data).includes('data:audio/'));
 // Consent withdrawal hides the formerly approved person immediately, then reviewer can approve anew.
 response=await send(`/api/catalogs/cooks/${cookId}`,{...cook,status:'draft',consent:false},capture,'PUT');assert.equal(response.status,200,await response.clone().text());assert.ok(!(await catalog()).cooks.some(record=>record.id===cookId));
 await send(`/api/catalogs/cooks/${cookId}`,{...cook,status:'verified'},review,'PUT');
 response=await send(`/api/catalogs/recipes/${recipeId}/publication`,{action:'unpublish'},review);assert.equal(response.status,200);assert.ok(!(await catalog()).recipes.some(record=>record.id===recipeId));
 await send(`/api/catalogs/recipes/${recipeId}/publication`,{action:'publish'},review);
 // A local duplicate must never override a published version from the supplied original database.
 response=await send('/api/catalogs/ingredients',{...ingredient,name:'Chile sintético',description:'COPIA QUE DEBE PERDER'},admin);assert.equal(response.status,201);
 data=await catalog();assert.equal(data.ingredients.filter(record=>record.name==='Chile sintético').length,1);assert.notEqual(data.ingredients.find(record=>record.name==='Chile sintético').description,'COPIA QUE DEBE PERDER');
 await exec(process.execPath,['scripts/init-unified.mjs'],{env,timeout:30000});
 data=await catalog();assert.ok(data.cooks.some(record=>record.id===cookId));assert.ok(data.episodes.some(record=>record.id===episodeId));assert.equal(data.timeline.length,5);
 const [cookieName,cookieValue]=admin.split('=');
 const session={origin,name:cookieName,value:cookieValue,reviewCookie:{name:review.split('=')[0],value:review.split('=')[1]},captureCookie:{name:capture.split('=')[0],value:capture.split('=')[1]},recipeId,cookId,ingredientId,episodeId,draftRecipeId,privateRecipeId:draftRecipeId,privateIngredientId,privateNames:['RECETA BORRADOR PRIVADO','INGREDIENTE PRIVADO','INFORMANTE PRIVADO','NOTAS PRIVADAS']};
 await writeFile('work/public-browser-session.json',JSON.stringify(session),{mode:0o600});
 console.log(`API/SQL public checks passed. Browser test runtime: ${origin}`);
 const browserChecks=[['tests/public_browser.py',['work/public-browser-session.json']],['tests/timeline_browser.py',[origin]],['tests/consistent_views_browser.py',['work/public-browser-session.json']]];
 // Reuse the same isolated data/permission checks for a focused map regression run.
 for(const [file,args] of process.argv.includes('--consistency-only')?browserChecks.slice(-1):browserChecks){
  const browser=await exec('python',[file,...args],{env,timeout:360000,maxBuffer:300000});console.log(browser.stdout.trim());
 }
 console.log('Public integration: approved snapshots, private drafts, roles, original DB, persistence and browser checks passed.');
}finally{
 if(server){server.kill('SIGTERM');await pause(500);if(server.exitCode===null)server.kill('SIGKILL');}
 if(log)await log.close();if(db)await db.end().catch(()=>{});
 if(container)await exec('docker',['rm','-fv',name]).catch(()=>{});
}
