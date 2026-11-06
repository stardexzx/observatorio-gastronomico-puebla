import assert from 'node:assert/strict';
import pg from 'pg';
const sessionCookie=process.env.TEST_SESSION_COOKIE;
if(!sessionCookie)throw new Error('Esta prueba requiere TEST_SESSION_COOKIE de una sesión autenticada. Para probar el flujo completo sin una cuenta propia, ejecuta test/auth-flow.mjs.');
const authenticatedFetch=(url,options={})=>globalThis.fetch(url,{...options,headers:{Cookie:sessionCookie,...options.headers}});
const origin='http://127.0.0.1:3000';
const db=new pg.Client({connectionString:process.env.DATABASE_URL});
await db.connect();
try {
 const list=await authenticatedFetch(`${origin}/api/recipes`);assert.equal(list.status,200);
 const {recipes}=await list.json();assert.ok(recipes.length>=2);
 const recipe=recipes.find(row=>row.name==='Receta de presentación · prueba');assert.ok(recipe,'La receta creada desde el navegador existe');
 assert.match(recipe.description,/frontend/);assert.equal(recipe.steps.length,1);
 const detail=await authenticatedFetch(`${origin}/api/recipes/${recipe.id}`);assert.equal(detail.status,200);
 const {rows:[row]}=await db.query(`SELECT r.titulo,r.descripcion,count(p.id)::int AS pasos FROM ogp.recetas_documentadas r LEFT JOIN ogp.receta_pasos p ON p.receta_id=r.id WHERE r.id=$1 GROUP BY r.id`,[recipe.id]);
 assert.equal(row.descripcion,recipe.description);assert.equal(row.pasos,1);
 const bad=await authenticatedFetch(`${origin}/api/recipes`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({...recipe,name:''})});assert.equal(bad.status,400);
 const crossOrigin=await authenticatedFetch(`${origin}/api/recipes`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://invalid.example'},body:JSON.stringify(recipe)});assert.equal(crossOrigin.status,403);
 const missing=await authenticatedFetch(`${origin}/api/recipes/00000000-0000-4000-8000-000000000000`);assert.equal(missing.status,404);
 const before=(await db.query('SELECT count(*)::int AS n FROM ogp.registros')).rows[0].n;
 const failed=await authenticatedFetch(`${origin}/api/recipes`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({...recipe,name:'Prueba transaccional que debe revertirse',description:'Error de codificación\u0000'})});assert.equal(failed.status,500);
 const after=(await db.query('SELECT count(*)::int AS n FROM ogp.registros')).rows[0].n;assert.equal(after,before,'Una operación fallida no deja registros parciales');
 const saved=await authenticatedFetch(`${origin}/api/recipes/${recipe.id}`,{method:'PUT',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({...recipe,ingredients:['Maíz'],techniques:['Tatemado']})});assert.equal(saved.status,200);
 const ingredient=await db.query('SELECT i.nombre FROM ogp.receta_ingredientes ri JOIN ogp.ingredientes i ON i.id=ri.ingrediente_id WHERE ri.receta_id=$1',[recipe.id]);assert.equal(ingredient.rows[0]?.nombre,'Maíz');
 console.log('OK: creación desde UI, persistencia, detalle, validación 400, origen 403, ausencia 404, rollback ante fallo, ingredientes relacionales y actualización.');
}finally{await db.end()}
