import 'server-only';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {SessionUser} from '@/lib/auth/types';
import {publicProjection,type PublicKind} from '@/lib/public-projection';
import {pool,requireDemo} from './postgres';

export class CatalogFailure extends Error{constructor(message:string,public status=400){super(message);}}
export const catalogKinds=['cooks','ingredients','episodes'] as const;
export type CatalogKind=typeof catalogKinds[number];
export const isCatalogKind=(value:string):value is CatalogKind=>catalogKinds.includes(value as CatalogKind);
export const isPublicKind=(value:string):value is PublicKind=>value==='recipes'||isCatalogKind(value);
const text=z.string().max(20000);
const list=z.array(z.string().max(1000)).max(150).default([]);
const image=z.object({id:z.string().max(100),name:z.string().max(500),url:z.string().max(14*1024*1024).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/),type:z.enum(['image/jpeg','image/png','image/webp']),size:z.number().int().min(1).max(10*1024*1024)});
const common={id:z.string().max(100).optional(),name:z.string().trim().min(1).max(250),municipality:text.default(''),municipalityCode:z.string().regex(/^21\d{3}$/).or(z.literal('')).default(''),region:text.default(''),status:z.enum(['draft','in-review','verified']).default('draft'),updatedAt:text.optional(),source:text.default(''),sourceReference:text.default(''),consultationDate:text.default(''),photos:z.array(image).max(30).default([]),completeness:z.number().min(0).max(100).default(0)};
const cookInput=z.object({...common,role:text.default(''),community:text.default(''),yearsExperience:text.default(''),languages:list,specialties:list,linkedRecipes:list,biography:text.default(''),recognitions:text.default(''),consent:z.boolean().default(false),quote:text.default(''),studentCount:z.number().int().nonnegative().default(0),collective:text.default(''),establishments:list,linkedMarkets:list,culinaryLineage:list,oralHistories:z.array(z.object({id:text,title:text,date:text,duration:text,url:z.string().max(14*1024*1024).refine(value=>value===''||/^data:audio\/(mpeg|mp4|x-m4a|wav|x-wav|ogg|webm);base64,[A-Za-z0-9+/=]+$/.test(value)||/^https:\/\/[^\s]+$/.test(value),'El audio debe ser un archivo admitido o enlace HTTPS.')})).max(100).default([]),verifiedAt:text.default(''),verifiedBy:text.default(''),sourceReferences:list});
const ingredientInput=z.object({...common,category:text.default(''),season:text.default(''),recipes:z.number().int().nonnegative().default(0),description:text.default(''),localNames:list,varieties:list,months:list,uses:list,linkedRecipes:list});
const episodeInput=z.object({id:z.string().max(100).optional(),title:z.string().trim().min(1).max(250),youtubeId:z.string().regex(/^[A-Za-z0-9_-]{11}$/),format:z.enum(['podcast','video']).default('podcast'),description:text.default(''),participants:text.default(''),date:text.default(''),municipality:text.default(''),municipalityCode:z.string().regex(/^21\d{3}$/).or(z.literal('')).default(''),recipeIds:list,ingredientIds:list,status:z.enum(['draft','published']).default('draft'),updatedAt:text.optional()});
const inputFor=(kind:CatalogKind)=>kind==='cooks'?cookInput:kind==='ingredients'?ingredientInput:episodeInput;
type Form=Record<string,unknown>;
export async function listCatalog(kind:CatalogKind){
 requireDemo();const {rows}=await pool.query(`SELECT f.form,p.published_at FROM demo.catalog_forms f LEFT JOIN demo.public_catalog_versions p ON p.kind=f.kind AND p.record_id=f.id WHERE f.kind=$1 ORDER BY f.updated_at DESC,f.id`,[kind]);
 return rows.map(row=>({...row.form,publicStatus:row.published_at?'published':'draft',publishedAt:row.published_at?.toISOString()??null}));
}
export async function getCatalogRecord(kind:CatalogKind,id:string){return (await listCatalog(kind)).find(record=>record.id===id)??null;}
function assertPublishable(kind:PublicKind,form:Form){
 if(kind!=='episodes'&&!/^21\d{3}$/.test(String(form.municipalityCode??'')))throw new CatalogFailure('Para publicar identifica el municipio documentado.');
 if(kind==='recipes'&&(!form.name||!form.description||!form.source||!form.sourceReference||!Array.isArray(form.ingredients)||!form.ingredients.length||!Array.isArray(form.steps)||!form.steps.some(value=>typeof value==='string'&&value.trim())))throw new CatalogFailure('Para publicar completa descripción, ingredientes, pasos y la fuente con su referencia.');
 if(kind==='cooks'&&(!form.consent||!form.biography||!form.source||!form.sourceReference))throw new CatalogFailure('Para publicar se requieren semblanza, fuente, referencia y autorización de la persona.');
 if(kind==='ingredients'&&(!form.description||!form.source||!form.sourceReference))throw new CatalogFailure('Para publicar completa la descripción, fuente y referencia del ingrediente.');
 if(kind==='episodes'&&(!form.description||!form.youtubeId))throw new CatalogFailure('Para publicar se requieren descripción y un video válido.');
}
async function snapshot(db:import('pg').PoolClient,kind:PublicKind,id:string,form:Form,user:SessionUser){
 if(user.role==='capturista')throw new CatalogFailure('Solo administración y revisión pueden publicar contenido.',403);
 assertPublishable(kind,form);
 await db.query(`INSERT INTO demo.public_catalog_versions(kind,record_id,snapshot,published_by) VALUES($1,$2,$3,$4) ON CONFLICT(kind,record_id) DO UPDATE SET snapshot=EXCLUDED.snapshot,published_by=EXCLUDED.published_by,published_at=now()`,[kind,id,JSON.stringify(publicProjection(kind,form)),user.id]);
}
export async function saveCatalog(kind:CatalogKind,body:unknown,id:string|undefined,user:SessionUser){
 requireDemo();const parsed=inputFor(kind).parse(body);const form:Form={...parsed,id:id||parsed.id||randomUUID(),updatedAt:new Date().toISOString()};
 const publicState=form.status==='verified'||form.status==='published';
 if(publicState&&user.role==='capturista')throw new CatalogFailure('Envía la ficha a revisión; solo administración o revisión pueden publicarla.',403);
 const db=await pool.connect();try{
  await db.query('BEGIN');
  if(id){const found=await db.query('SELECT id,created_by FROM demo.catalog_forms WHERE kind=$1 AND id=$2 FOR UPDATE',[kind,id]);if(!found.rowCount)throw new CatalogFailure('Ficha no encontrada.',404);if(user.role==='capturista'&&found.rows[0].created_by!==user.id)throw new CatalogFailure('Solo puedes editar las fichas que capturaste.',403);}
  else if((await db.query('SELECT id FROM demo.catalog_forms WHERE kind=$1 AND id=$2',[kind,form.id])).rowCount)throw new CatalogFailure('Ya existe una ficha con ese identificador.',409);
  if(kind==='episodes'&&(await db.query("SELECT id FROM demo.catalog_forms WHERE kind='episodes' AND form->>'youtubeId'=$1 AND id<>$2",[form.youtubeId,form.id])).rowCount)throw new CatalogFailure('Este video ya está registrado.',409);
  await db.query(`INSERT INTO demo.catalog_forms(kind,id,form,created_by,updated_by) VALUES($1,$2,$3,$4,$4) ON CONFLICT(kind,id) DO UPDATE SET form=EXCLUDED.form,updated_by=EXCLUDED.updated_by,updated_at=now()`,[kind,form.id,JSON.stringify(form),user.id]);
  if(publicState)await snapshot(db,kind,String(form.id),form,user);
  // Explicit withdrawal or revocation must take effect immediately, even while a revision is pending.
  else if(user.role!=='capturista'||kind==='cooks'&&!form.consent)await db.query('DELETE FROM demo.public_catalog_versions WHERE kind=$1 AND record_id=$2',[kind,form.id]);
  await db.query('COMMIT');return {...form,publicStatus:publicState?'published':'draft'};
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
export async function deleteCatalog(kind:CatalogKind,id:string,user:SessionUser){
 requireDemo();if(user.role==='capturista')throw new CatalogFailure('Solo administración o revisión pueden eliminar fichas.',403);
 const db=await pool.connect();try{await db.query('BEGIN');await db.query('DELETE FROM demo.public_catalog_versions WHERE kind=$1 AND record_id=$2',[kind,id]);const removed=await db.query('DELETE FROM demo.catalog_forms WHERE kind=$1 AND id=$2',[kind,id]);await db.query('COMMIT');return Boolean(removed.rowCount);}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
export async function publicationState(kind:PublicKind,id:string){
 requireDemo();const {rows:[row]}=await pool.query('SELECT published_at FROM demo.public_catalog_versions WHERE kind=$1 AND record_id=$2',[kind,id]);return {published:Boolean(row),publishedAt:row?.published_at?.toISOString()??null};
}
export async function publishCatalog(kind:PublicKind,id:string,action:'publish'|'unpublish',user:SessionUser){
 requireDemo();if(user.role==='capturista')throw new CatalogFailure('Solo administración y revisión pueden publicar contenido.',403);
 const db=await pool.connect();try{await db.query('BEGIN');
  if(action==='unpublish')await db.query('DELETE FROM demo.public_catalog_versions WHERE kind=$1 AND record_id=$2',[kind,id]);
  else{
   const {rows:[row]}=kind==='recipes'?await db.query(`SELECT f.form||jsonb_build_object('id',r.id,'name',r.titulo,'description',r.descripcion) AS form FROM demo.recipe_forms f JOIN ogp.recetas_documentadas r ON r.id=f.receta_id JOIN ogp.registros reg ON reg.id=r.id WHERE r.id::text=$1 AND reg.archivado_en IS NULL FOR UPDATE OF f`,[id]):await db.query('SELECT form FROM demo.catalog_forms WHERE kind=$1 AND id=$2 FOR UPDATE',[kind,id]);
   if(!row)throw new CatalogFailure('Ficha no encontrada.',404);await snapshot(db,kind,id,row.form,user);
  }
  await db.query('COMMIT');return {published:action==='publish'};
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
