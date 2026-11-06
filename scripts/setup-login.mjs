import {readFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import pg from 'pg';
const email=process.argv[2]?.trim().toLowerCase();
if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Indica el correo de la primera cuenta.');
if(!process.env.DATABASE_URL||new URL(process.env.DATABASE_URL).pathname!=='/observatorio_puebla_test')throw new Error('Comprueba la base de datos local configurada.');
const db=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
await db.connect();
try{
 await db.query(await readFile(new URL('../database/migrations/006_login.sql',import.meta.url),'utf8'));
 await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(982341)");
 const {rows:[count]}=await db.query('SELECT count(*)::int AS n FROM app_auth.credentials');
 if(count.n>0)throw new Error('Ya existen cuentas activadas. No se modifica su contraseña.');
 await db.query('UPDATE app_auth.activations SET vence_en=now() WHERE usado_en IS NULL AND vence_en>now()');
 const token=randomBytes(32).toString('base64url');
 await db.query("INSERT INTO app_auth.activations(token_hash,correo,nombre,role_code,vence_en) VALUES ($1,$2,$3,'administrador',now()+interval '24 hours')",[createHash('sha256').update(token).digest('hex'),email,email.split('@')[0]]);
 await db.query('COMMIT');
 console.log(JSON.stringify({email,activationUrl:`http://localhost:5173/activar-cuenta?token=${token}`,expiresInHours:24}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}
