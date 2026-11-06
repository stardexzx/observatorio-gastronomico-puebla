import pg from "pg";
import { randomUUID } from "node:crypto";
if (process.env.DEMO_MODE !== "true" || new URL(process.env.DATABASE_URL).pathname !== "/observatorio_puebla_test") throw new Error("Usar solamente la base observatorio_puebla_test y DEMO_MODE=true");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
 await db.query("BEGIN");
 await db.query(`CREATE SCHEMA IF NOT EXISTS demo;
 REVOKE ALL ON SCHEMA demo FROM PUBLIC;
 CREATE TABLE IF NOT EXISTS demo.recipe_forms (
   receta_id uuid PRIMARY KEY REFERENCES ogp.recetas_documentadas(id),
   form jsonb NOT NULL,
   actualizado_en timestamptz NOT NULL DEFAULT now()
 );
 REVOKE ALL ON ALL TABLES IN SCHEMA demo FROM PUBLIC;`);
 const {rows:[actor]}=await db.query(`INSERT INTO ogp.usuarios(correo,nombre,estado)
 VALUES ('demo-local@invalid.example','Presentación local','activo')
 ON CONFLICT(correo) DO UPDATE SET nombre=EXCLUDED.nombre RETURNING id`);
 await db.query("SELECT set_config('ogp.actor_id',$1,true)",[actor.id]);
 await db.query(`INSERT INTO ogp.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM ogp.roles WHERE codigo='capturista' ON CONFLICT DO NOTHING`,[actor.id]);
 await db.query(`INSERT INTO ogp.usuario_modulos(usuario_id,modulo) SELECT $1,codigo FROM ogp.tipos_registro WHERE codigo IN ('preparacion','receta','ingrediente') ON CONFLICT DO NOTHING`,[actor.id]);
 // Fixtures inequívocos, únicamente en test; no crean municipios o fuentes oficiales.
 const {rows:[count]}=await db.query('SELECT count(*)::int AS n FROM demo.recipe_forms');
 if(count.n===0) for(const name of ['Mole · demostración','Chalupas · demostración']) {
  const prep=randomUUID(),recipe=randomUUID();
  await db.query(`INSERT INTO ogp.registros(id,tipo,creado_por) VALUES ($1,'preparacion',$3),($2,'receta',$3)`,[prep,recipe,actor.id]);
  await db.query('INSERT INTO ogp.preparaciones(id,nombre,descripcion) VALUES ($1,$2,$3)',[prep,name,'Datos sintéticos para presentación.']);
  await db.query('INSERT INTO ogp.recetas_documentadas(id,preparacion_id,titulo,descripcion) VALUES ($1,$2,$3,$4)',[recipe,prep,name,'Ejemplo de prueba; no es documentación gastronómica verificada.']);
  await db.query('INSERT INTO demo.recipe_forms(receta_id,form) VALUES ($1,$2)',[recipe,JSON.stringify({id:recipe,name,municipality:'Puebla',municipalityCode:'21114',region:'Angelópolis',description:'Ejemplo de prueba; no es documentación gastronómica verificada.',status:'draft'})]);
 }
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');
 await db.query('COMMIT');
 console.log('Demo preparada en observatorio_puebla_test. Datos sintéticos identificados; sin publicaciones.');
} catch(e) { await db.query('ROLLBACK'); throw e; } finally { await db.end(); }
