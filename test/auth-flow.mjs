import assert from 'node:assert/strict';
import {randomBytes,createHash,randomUUID,scryptSync} from 'node:crypto';
import pg from 'pg';
const origin=process.env.TEST_ORIGIN??'http://localhost:5173';
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
const created=[];let recipeId;let adminCookie;const runId=randomUUID();
const missingEmail=`missing-${runId}@invalid.example`;
const post=(path,body,cookie='',external=false)=>fetch(`${origin}${path}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:external?'https://example.org':origin,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body),redirect:'manual'});
const get=(path,cookie='')=>fetch(`${origin}${path}`,{headers:cookie?{Cookie:cookie}:{},redirect:'manual'});
const tokenHash=value=>createHash('sha256').update(value).digest('hex');
try{
 let response=await get('/');assert.equal(response.status,307);assert.equal(new URL(response.headers.get('location'),origin).pathname,'/iniciar-sesion');
 response=await get('/recetas');assert.equal(response.status,307);
 response=await get('/api/recipes');assert.equal(response.status,401);
 response=await get('/','ogp_session=forged');assert.equal(response.status,307);
 for(const role of ['administrador','capturista','revisor']){
  const token=randomBytes(32).toString('base64url');const email=`auth-test-${role}-${runId}@invalid.example`;const password=randomBytes(24).toString('base64url');
  created.push(email);
  await db.query("INSERT INTO app_auth.activations(token_hash,correo,nombre,role_code,vence_en) VALUES ($1,$2,$3,$4,now()+interval '10 minutes')",[tokenHash(token),email,`Prueba ${role}`,role]);
  if(role==='administrador'){
   // Synthetic test administrator only; never consume the real bootstrap link.
   const salt=randomBytes(16).toString('hex');const hash=`scrypt$${salt}$${scryptSync(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex')}`;
   const {rows:[user]}=await db.query("INSERT INTO ogp.usuarios(nombre,correo,estado) VALUES($1,$2,'activo') RETURNING id",['Administrador de prueba',email]);
   await db.query('INSERT INTO app_auth.credentials(usuario_id,password_hash) VALUES($1,$2)',[user.id,hash]);
   await db.query("INSERT INTO ogp.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM ogp.roles WHERE codigo='administrador'",[user.id]);
   await db.query('INSERT INTO ogp.usuario_modulos(usuario_id,modulo) SELECT $1,codigo FROM ogp.tipos_registro ON CONFLICT DO NOTHING',[user.id]);
  }else{
   response=await post('/api/administracion/personas',{action:'save',name:`Prueba ${role}`,email,role,password},adminCookie);assert.equal(response.status,200,await response.text());
  }
  response=await post('/api/auth/activate',{token,password});assert.equal(response.status,400);
  response=await post('/api/auth/login',{email,password:'wrong-password'});assert.equal(response.status,401);
  response=await post('/api/auth/login',{email,password,role:'administrador'});assert.equal(response.status,200,role);
  const body=await response.json();assert.equal(body.redirect,'/');
  const setCookie=response.headers.get('set-cookie');assert.match(setCookie,/HttpOnly/i);assert.match(setCookie,/SameSite=lax/i);
  const cookie=setCookie.split(';')[0];
  response=await get('/',cookie);assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('Resumen del observatorio'));assert.ok(html.includes(email));
  response=await get('/iniciar-sesion',cookie);assert.equal(response.status,307);assert.equal(new URL(response.headers.get('location'),origin).pathname,'/');
  response=await get('/administracion/roles',cookie);assert.equal(response.status,role==='administrador'?200:307);
  response=await get('/api/recipes',cookie);assert.equal(response.status,200);
  response=await get('/api/administracion/personas',cookie);assert.equal(response.status,role==='administrador'?200:403);
  if(role!=='administrador'){
   response=await post('/api/administracion/personas',{action:'password',id:randomUUID(),password},cookie);assert.equal(response.status,403);
  }
  if(role==='administrador'){
   adminCookie=cookie;
   response=await fetch(`${origin}/api/recipes`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},body:JSON.stringify({name:`Verificación de sesión ${runId}`,municipality:'Puebla',municipalityCode:'21114'})});
   const data=await response.json();assert.equal(response.status,201,JSON.stringify(data));recipeId=data.recipe.id;
   const {rows:[audit]}=await db.query('SELECT r.creado_por,u.correo FROM ogp.registros r JOIN ogp.usuarios u ON u.id=r.creado_por WHERE r.id=$1',[recipeId]);assert.equal(audit.correo,email);
   response=await fetch(`${origin}/api/recipes/${recipeId}`,{method:'DELETE',headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie}});assert.equal(response.status,200);recipeId=null;
  }
  if(role==='revisor'){response=await post('/api/recipes',{name:'No permitido'},cookie);assert.equal(response.status,403);}
  response=await post('/api/auth/logout',{},cookie,true);assert.equal(response.status,403);
  if(role!=='administrador'){
   const {rows:[user]}=await db.query('SELECT id FROM ogp.usuarios WHERE correo=$1',[email]);
   const newPassword=randomBytes(24).toString('base64url');
   response=await post('/api/administracion/personas',{action:'password',id:user.id,password:newPassword},adminCookie);assert.equal(response.status,200,await response.text());
   response=await get('/',cookie);assert.equal(response.status,307);
   response=await post('/api/auth/login',{email,password});assert.equal(response.status,401);
   response=await post('/api/auth/login',{email,password:newPassword});assert.equal(response.status,200);
   const fresh=response.headers.get('set-cookie').split(';')[0];
   response=await post('/api/auth/logout',{},fresh);assert.equal(response.status,200);
   response=await get('/',fresh);assert.equal(response.status,307);
  }else{
   const {rows:[user]}=await db.query('SELECT id FROM ogp.usuarios WHERE correo=$1',[email]);
   response=await post('/api/administracion/personas',{action:'role',ids:[user.id],role:'revisor'},cookie);assert.equal(response.status,409);
  }
 }
 // Removing a person revokes access while preserving their authored records and identity.
 const removedEmail=`removed-${runId}@invalid.example`;created.push(removedEmail);const removedPassword=randomBytes(24).toString('base64url');
 let removal=await post('/api/administracion/personas',{action:'save',name:'Persona eliminable de prueba',email:removedEmail,role:'capturista',password:removedPassword},adminCookie);assert.equal(removal.status,200);
 const removedId=(await removal.json()).members.find(member=>member.email===removedEmail).id;
 removal=await post('/api/auth/login',{email:removedEmail,password:removedPassword});assert.equal(removal.status,200);const removedCookie=removal.headers.get('set-cookie').split(';')[0];
 removal=await post('/api/administracion/personas',{action:'delete',id:removedId},removedCookie);assert.equal(removal.status,403);
 const adminId=(await db.query('SELECT id FROM ogp.usuarios WHERE correo=$1',[created[0]])).rows[0].id;
 removal=await post('/api/administracion/personas',{action:'delete',id:adminId,role:'administrador'},adminCookie);assert.equal(removal.status,409);
 removal=await post('/api/administracion/personas',{action:'delete',id:removedId},adminCookie);assert.equal(removal.status,200);assert.ok(!(await removal.json()).members.some(member=>member.id===removedId));
 removal=await get('/',removedCookie);assert.equal(removal.status,307);
 removal=await post('/api/auth/login',{email:removedEmail,password:removedPassword});assert.equal(removal.status,401);
 assert.equal((await db.query('SELECT estado FROM ogp.usuarios WHERE id=$1',[removedId])).rows[0].estado,'desactivado');
 for(let i=0;i<6;i++){response=await post('/api/auth/login',{email:missingEmail,password:'wrong-password'});assert.equal(response.status,i<5?401:429);}
 response=await post('/api/auth/login',{email:missingEmail,password:'wrong-password'},'',true);assert.equal(response.status,403);
 await post('/api/auth/logout',{},adminCookie);
 console.log('OK: eliminación del equipo revoca acceso y conserva identidad; autoeliminación bloqueada; acceso anónimo bloqueado; activación pública restringida; contraseñas asignadas solo por administrador; cambio invalida contraseña y sesiones anteriores; los tres roles llegan al Resumen; perfiles reales; protección de administración y API; autoría de captura; cierre y revocación de sesión; bloqueo de intentos y origen.');
}finally{
 if(recipeId&&adminCookie)await fetch(`${origin}/api/recipes/${recipeId}`,{method:'DELETE',headers:{'Content-Type':'application/json',Origin:origin,Cookie:adminCookie}});
 // Conservar auditoría, desactivar solo las identidades sintéticas creadas por esta prueba.
 for(const email of created){await db.query("UPDATE ogp.usuarios SET estado='desactivado' WHERE correo=$1",[email]);await db.query('DELETE FROM app_auth.credentials WHERE usuario_id IN (SELECT id FROM ogp.usuarios WHERE correo=$1)',[email]);await db.query('DELETE FROM app_auth.activations WHERE correo=$1',[email]);await db.query('DELETE FROM app_auth.login_attempts WHERE email_hash=$1',[tokenHash(email)]);}
 await db.query('DELETE FROM app_auth.login_attempts WHERE email_hash=$1',[tokenHash(missingEmail)]);await db.end();
}
