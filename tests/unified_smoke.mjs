// Prueba aislada: su contenedor y las cuentas sintéticas se eliminan al terminar.
import {randomBytes} from 'node:crypto';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from 'pg';
const exec=promisify(execFile), name=`ogp_unified_test_${randomBytes(5).toString('hex')}`;
const password=randomBytes(24).toString('hex');
const image='postgis/postgis:16-3.5@sha256:94146ac37bc61e2322f88016056c5920729cb8c64c8542ed590af8fc2abdac07';
let container=false,server,db,log;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=()=>new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
try {
 await mkdir('work',{recursive:true});
 await exec('docker',['run','--rm','-d','--name',name,'-e','POSTGRES_DB=observatorio_puebla_test','-e','POSTGRES_USER=ogp_admin','-e',`POSTGRES_PASSWORD=${password}`,'-p','127.0.0.1::5432',image],{timeout:60000});container=true;
 const binding=(await exec('docker',['port',name,'5432/tcp'])).stdout.trim();
 const port=Number(binding.split(':').at(-1));
 const url=new URL(`postgresql://ogp_admin@127.0.0.1:${port}/observatorio_puebla_test`);url.password=password;
 const env={...process.env,DATABASE_URL:url.toString(),DEMO_MODE:'true',NEXT_TELEMETRY_DISABLED:'1'};
 for(let i=0;i<60;i++) {
  try {const c=new pg.Client({connectionString:env.DATABASE_URL});await c.connect();await c.query('SELECT 1');await c.end();break;}catch(e){if(i===59)throw e;await pause(1000);}
 }
 await exec(process.execPath,['scripts/init-unified.mjs'],{env,timeout:30000});
 await exec(process.execPath,['scripts/init-unified.mjs'],{env,timeout:30000});
 db=new pg.Client({connectionString:env.DATABASE_URL});await db.connect();
 for(const table of ['ogp.usuarios','ogp.registros','demo.recipe_forms','app_auth.credentials']) assert.equal((await db.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n,'0',`${table}: sin semillas`);
 await db.query(await readFile('database/tests/integrity.sql','utf8'));
 assert.equal((await db.query('SELECT count(*) AS n FROM ogp.registros')).rows[0].n,'0');
 console.log('SQL: instalación, segunda aplicación e integridad correctas, sin cuentas ni fichas iniciales.');
 const email='unified-smoke@invalid.example';
 const setup=await exec(process.execPath,['scripts/setup-login.mjs',email],{env});
 const activation=JSON.parse(setup.stdout);
 const token=new URL(activation.activationUrl).searchParams.get('token');
 const appPort=await freePort(), origin=`http://127.0.0.1:${appPort}`;
 log=await open('work/unified-server.log','w',0o600);
 server=spawn(process.execPath,['scripts/unified-framework.mjs',process.argv.includes('--production')?'start':'dev','--port',String(appPort)],{env,stdio:['ignore',log.fd,log.fd]});
 let ready=false;
 for(let i=0;i<120;i++){try{const r=await fetch(origin+'/iniciar-sesion');if(r.status===200){ready=true;break;}}catch{}if(server.exitCode!==null)throw new Error('El servidor Next terminó antes de iniciar. Consulta work/unified-server.log.');await pause(1000);}
 assert.ok(ready,'Next debe iniciar');
 const post=(path,body,cookie)=>fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body),redirect:'manual'});
 assert.equal((await fetch(origin+'/api/recipes')).status,401);
 const accountPassword=randomBytes(24).toString('base64url');
 let response=await post('/api/auth/activate',{token,password:accountPassword});assert.equal(response.status,200,await response.text());
 response=await post('/api/auth/login',{email,password:accountPassword});assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie').split(';')[0];
 response=await post('/api/recipes',{name:'Receta autoritaria de integración',municipality:'Puebla',municipalityCode:'21114',description:'Registro sintético temporal',ingredients:['Maíz'],steps:['Paso sintético']},cookie);
 const body=await response.json();assert.equal(response.status,201,JSON.stringify(body));
 const recipeId=body.recipe.id;
 await exec(process.execPath,['scripts/init-unified.mjs'],{env});
 assert.equal((await db.query('SELECT titulo FROM ogp.recetas_documentadas WHERE id=$1',[recipeId])).rows[0].titulo,'Receta autoritaria de integración','la migración conserva capturas');
 const [cookieName,cookieValue]=cookie.split('=');
 await writeFile('work/unified-browser-session.json',JSON.stringify({origin,name:cookieName,value:cookieValue,recipeId}),{mode:0o600});
 const browser=await exec('python',['tests/unified_browser.py','work/unified-browser-session.json'],{env,timeout:300000,maxBuffer:300000});
 console.log(browser.stdout.trim());
 const flow=await exec(process.execPath,['test/auth-flow.mjs'],{env:{...env,TEST_ORIGIN:origin},timeout:180000,maxBuffer:100000});
 console.log(flow.stdout.trim());
 console.log('Integración unificada: autenticación y recetas del autor, módulos conservados y protección de datos correctos.');
} finally {
 if(server){server.kill('SIGTERM');await pause(600);if(server.exitCode===null)server.kill('SIGKILL');}
 if(log)await log.close();
 if(db)await db.end().catch(()=>{});
 if(container)await exec('docker',['rm','-fv',name]).catch(()=>{});
}
