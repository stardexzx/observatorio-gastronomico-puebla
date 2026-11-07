import { z } from "zod";
import { pool, requireDemo } from "./postgres";
import { createBlankRecipe, normalizeRecipe, recipeSourceComplete, type RecipeRecord } from "@/data/recipes";
const uuid = z.string().uuid();
const text = z.string().max(20000);
const mediaBase = z.object({id:z.string().max(100),name:z.string().max(500),caption:text.default(""),type:z.string(),size:z.number().int().nonnegative(),url:z.string()});
const photo = mediaBase.extend({type:z.enum(["image/jpeg","image/png","image/webp"]),size:z.number().int().min(1).max(8*1024*1024),url:z.string().max(12*1024*1024).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)});
const audio = mediaBase.extend({type:z.enum(["audio/mpeg","audio/mp4","audio/x-m4a","audio/wav","audio/x-wav"]),size:z.number().int().min(1).max(20*1024*1024),url:z.string().max(28*1024*1024).regex(/^data:audio\/(mpeg|mp4|x-m4a|wav|x-wav);base64,[A-Za-z0-9+/=]+$/)});
const input = z.object({
 status:z.enum(["draft","in-review"]).default("draft"),
 name: z.string().trim().min(1).max(250), category: text.default(""), description: text.default(""),
 municipality: text.default(""), municipalityCode: z.string().regex(/^21[0-9]{3}$/), region: text.default(""),
 vigency: text.default(""), source: text.default(""), sourceReference: text.default(""), sourceUrl: text.default(""), consultationDate: text.default(""),
 ingredients: z.array(z.string().trim().min(1).max(250)).max(100).default([]),
 techniques: z.array(z.string().max(250)).max(100).default([]),
 steps: z.array(text).max(100).default([]), months:z.array(text).max(12).default([]),
 occasions:z.array(text).max(30).default([]), completeness:z.number().min(0).max(100).default(0),
 informant:z.object({name:text,role:text,municipality:text,municipalityCode:text,interviewDate:text}).optional(),
 photos:z.array(photo).max(50).default([]), audio:z.array(audio).max(20).default([]),
});
const baseQuery = `SELECT r.id, r.titulo, r.descripcion, f.form, f.actualizado_en,p.published_at,
 coalesce((SELECT jsonb_agg(p.instrucciones ORDER BY p.orden) FROM ogp.receta_pasos p WHERE p.receta_id=r.id),'[]'::jsonb) AS pasos
 FROM demo.recipe_forms f JOIN ogp.recetas_documentadas r ON r.id=f.receta_id
 JOIN ogp.registros registro ON registro.id=r.id
 LEFT JOIN demo.public_catalog_versions p ON p.kind='recipes' AND p.record_id=r.id::text`;
type RecipeRow = {id:string;titulo:string;descripcion:string|null;form:Partial<RecipeRecord>;actualizado_en:Date|string;pasos:string[];published_at?:Date|string|null};
function mapRow(row: RecipeRow):RecipeRecord {
 return normalizeRecipe({...createBlankRecipe(),...row.form,id:row.id,name:row.titulo,description:row.descripcion??"",steps:row.pasos,status:row.form?.status==="in-review"?"in-review":"draft",publicStatus:row.published_at?'published':'draft',publishedAt:row.published_at?new Date(row.published_at).toISOString():undefined,updatedAt:new Intl.DateTimeFormat("es-MX",{day:"2-digit",month:"short",year:"numeric",timeZone:"America/Mexico_City"}).format(new Date(row.actualizado_en))});
}
export async function listRecipes(){requireDemo();return (await pool.query(baseQuery+' WHERE registro.archivado_en IS NULL ORDER BY f.actualizado_en DESC,r.id')).rows.map(mapRow)}
export async function getRecipe(id:string){uuid.parse(id);requireDemo();const result=await pool.query(baseQuery+' WHERE r.id=$1 AND registro.archivado_en IS NULL',[id]);return result.rows[0]?mapRow(result.rows[0]):null}
export async function saveRecipe(body:unknown,id:string|undefined,actorId:string){
 requireDemo();uuid.parse(actorId);const form=input.parse(body);if(id)uuid.parse(id);
 const complete=[Boolean(form.category&&form.description.trim()&&form.vigency),Boolean(form.ingredients.length&&form.techniques.length),form.steps.some(step=>step.trim()),Boolean(form.months.length||form.occasions.length),recipeSourceComplete(form),Boolean(form.photos.length||form.audio.length)];
 form.completeness=Math.round(complete.filter(Boolean).length/6*100);
 const db=await pool.connect();let recipeId=id;
 try {
  await db.query('BEGIN');
  const {rows:[actor]}=await db.query("SELECT id FROM ogp.usuarios WHERE id=$1 AND estado='activo'",[actorId]);
  if(!actor)throw new Error('La cuenta no está disponible.');
  await db.query("SELECT set_config('ogp.actor_id',$1,true)",[actor.id]);
  let prepId:string;
  if(id){
   const {rows:[row]}=await db.query('SELECT r.preparacion_id FROM ogp.recetas_documentadas r JOIN demo.recipe_forms f ON f.receta_id=r.id JOIN ogp.registros registro ON registro.id=r.id WHERE r.id=$1 AND registro.archivado_en IS NULL FOR UPDATE OF r, registro',[id]);
   if(!row)throw new Error('Receta no encontrada');prepId=row.preparacion_id;
   await assignAdminCapture(db,actor.id,id);
   await db.query("SELECT ogp.exigir_permiso($1,'receta','editar',$2)",[actor.id,id]);
  }else{
   prepId=(await db.query("SELECT ogp.crear_registro($1,'preparacion') AS id",[actor.id])).rows[0].id;
   await db.query('INSERT INTO ogp.preparaciones(id,nombre) VALUES ($1,$2)',[prepId,form.name]);
   recipeId=(await db.query("SELECT ogp.crear_registro($1,'receta') AS id",[actor.id])).rows[0].id;
   await db.query('INSERT INTO ogp.recetas_documentadas(id,preparacion_id,titulo) VALUES ($1,$2,$3)',[recipeId,prepId,form.name]);
  }
  const category:Record<string,string>={Mole:'moles_salsas',Antojito:'antojitos',Guiso:'guisos',Sopa:'sopas_caldos',Dulce:'dulces_postres',Pan:'panes',Bebida:'bebidas',Salsa:'moles_salsas',Otro:'otra'};
  await db.query('UPDATE ogp.preparaciones SET nombre=$2,descripcion=$3,categoria_id=(SELECT id FROM ogp.categorias_preparacion WHERE codigo=$4) WHERE id=$1',[prepId,form.name,form.description,category[form.category]??null]);
  const vigency:Record<string,string>={'Se prepara actualmente':'practica_actual','Poco frecuente':'poco_frecuente','En desuso':'en_desuso'};
  await db.query('UPDATE ogp.recetas_documentadas SET titulo=$2,descripcion=$3,ocasion=$4,vigencia_culinaria=$5 WHERE id=$1',[recipeId,form.name,form.description,form.occasions.join(', '),vigency[form.vigency]??'no_documentada']);
  await db.query('DELETE FROM ogp.receta_pasos WHERE receta_id=$1',[recipeId]);
  for(const [i,step] of form.steps.filter(s=>s.trim()).entries()) await db.query('INSERT INTO ogp.receta_pasos(receta_id,orden,instrucciones) VALUES ($1,$2,$3)',[recipeId,i+1,step]);
  await db.query('DELETE FROM ogp.receta_ingredientes WHERE receta_id=$1',[recipeId]);
  for(const [i,name] of [...new Set(form.ingredients)].entries()){
   let ingredient=(await db.query('SELECT id FROM ogp.ingredientes WHERE lower(nombre::text)=lower($1) ORDER BY id LIMIT 1',[name])).rows[0]?.id;
   if(!ingredient){ingredient=(await db.query("SELECT ogp.crear_registro($1,'ingrediente') AS id",[actor.id])).rows[0].id;await db.query('INSERT INTO ogp.ingredientes(id,nombre) VALUES ($1,$2)',[ingredient,name]);}
   await db.query('INSERT INTO ogp.receta_ingredientes(receta_id,ingrediente_id,orden) VALUES ($1,$2,$3)',[recipeId,ingredient,i+1]);
  }
  await db.query('DELETE FROM ogp.receta_tecnicas WHERE receta_id=$1',[recipeId]);
  for(const technique of [...new Set(form.techniques)]) await db.query('INSERT INTO ogp.receta_tecnicas(receta_id,tecnica_id) SELECT $1,id FROM ogp.tecnicas WHERE nombre=$2 ON CONFLICT DO NOTHING',[recipeId,technique]);
  await db.query('INSERT INTO demo.recipe_forms(receta_id,form) VALUES ($1,$2) ON CONFLICT(receta_id) DO UPDATE SET form=EXCLUDED.form,actualizado_en=now()',[recipeId,JSON.stringify({...form,id:recipeId})]);
  await db.query('UPDATE ogp.registros SET actualizado_en=now() WHERE id=$1',[recipeId]);
  await db.query('SET CONSTRAINTS ALL IMMEDIATE');
  await db.query('COMMIT');
 }catch(error){await db.query('ROLLBACK');throw error}finally{db.release()}
 return getRecipe(recipeId!);
}

export async function archiveRecipe(id:string,actorId:string):Promise<boolean>{
 uuid.parse(id);uuid.parse(actorId);requireDemo();const db=await pool.connect();
 try{
  await db.query('BEGIN');
  const {rows:[actor]}=await db.query("SELECT id FROM ogp.usuarios WHERE id=$1 AND estado='activo'",[actorId]);
  if(!actor)throw new Error('No se pudo identificar al responsable de la operación.');
  await db.query("SELECT set_config('ogp.actor_id',$1,true)",[actor.id]);
  const {rows:[recipe]}=await db.query('SELECT r.id FROM ogp.registros r JOIN demo.recipe_forms f ON f.receta_id=r.id WHERE r.id=$1 AND r.archivado_en IS NULL FOR UPDATE OF r',[id]);
  if(!recipe){await db.query('ROLLBACK');return false;}
  await assignAdminCapture(db,actor.id,id);
  await db.query("SELECT ogp.exigir_permiso($1,'receta','editar',$2)",[actor.id,id]);
  await db.query('UPDATE ogp.registros SET archivado_en=now(),actualizado_en=now() WHERE id=$1',[id]);
  await db.query('COMMIT');return true;
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}

async function assignAdminCapture(db:import("pg").PoolClient,userId:string,recipeId:string){
 await db.query(`INSERT INTO ogp.asignaciones_registro(registro_id,usuario_id,funcion)
 SELECT $2,$1,'captura' WHERE EXISTS(SELECT 1 FROM ogp.usuario_roles ur JOIN ogp.roles r ON r.id=ur.rol_id AND r.activo WHERE ur.usuario_id=$1 AND r.codigo='administrador')
 ON CONFLICT DO NOTHING`,[userId,recipeId]);
}
