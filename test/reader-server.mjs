import assert from 'node:assert/strict';
import {randomUUID,randomBytes,scryptSync,createHash} from 'node:crypto';
import {writeFile,readFile,unlink,stat} from 'node:fs/promises';
import pg from 'pg';
const db=new pg.Client({connectionString:process.env.DATABASE_URL});const fixture='/tmp/observatorio-reader-test.json';await db.connect();
try{
 if(process.argv.includes('--cleanup')){
  const {id,email}=JSON.parse(await readFile(fixture,'utf8'));
  await db.query("UPDATE ogp.usuarios SET estado='desactivado' WHERE id=$1 AND correo=$2",[id,email]);
  await db.query('DELETE FROM app_auth.credentials WHERE usuario_id=$1',[id]);
  await db.query('DELETE FROM app_auth.login_attempts WHERE email_hash=$1',[createHash('sha256').update(email).digest('hex')]);
  await unlink(fixture);console.log('Cuenta sintética y sesiones de prueba retiradas.');
 }else{
  const email=`reader-test-${randomUUID()}@invalid.example`;const password=randomBytes(24).toString('base64url');const salt=randomBytes(16).toString('hex');const hash=`scrypt$${salt}$${scryptSync(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex')}`;
  await db.query('BEGIN');const {rows:[user]}=await db.query("INSERT INTO ogp.usuarios(nombre,correo,estado) VALUES('Lectura de prueba',$1,'activo') RETURNING id",[email]);
  await db.query('INSERT INTO app_auth.credentials(usuario_id,password_hash) VALUES($1,$2)',[user.id,hash]);await db.query("INSERT INTO ogp.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM ogp.roles WHERE codigo='revisor'",[user.id]);await db.query('COMMIT');
  await writeFile(fixture,JSON.stringify({id:user.id,email,password}),{mode:0o600});
  const origin='http://localhost:5173';let response=await fetch(`${origin}/api/recetarios/cocina-dig-2`);assert.equal(response.status,401);
  response=await fetch(`${origin}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email,password})});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];
  const url=`${origin}/api/recetarios/cocina-dig-2`;const {size}=await stat(new URL('../assets/recetarios/cocina-dig-2.pdf',import.meta.url));
  response=await fetch(url,{method:'HEAD',headers:{Cookie:cookie}});assert.equal(response.status,200);assert.equal(Number(response.headers.get('content-length')),size);
  response=await fetch(url,{headers:{Cookie:cookie,Range:'bytes=0-1023'}});assert.equal(response.status,206);const body=Buffer.from(await response.arrayBuffer());assert.equal(body.length,1024);assert.equal(body.subarray(0,5).toString(),'%PDF-');assert.match(response.headers.get('cache-control'),/private/);
  response=await fetch(url,{headers:{Cookie:cookie,Range:`bytes=${size}-`}});assert.equal(response.status,416);
  response=await fetch(`${origin}/api/recetarios/not-a-book`,{headers:{Cookie:cookie}});assert.equal(response.status,404);
  console.log('OK: PDF protegido por sesión, HEAD correcto, descarga parcial válida, rangos inválidos bloqueados y catálogo restringido. Cuenta sintética lista para revisión visual.');
 }
}finally{await db.end();}
