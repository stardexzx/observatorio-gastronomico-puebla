import 'server-only';
import {pool,requireDemo} from './postgres';
import {normalizeRecipe} from '@/data/recipes';
import {normalizeCook} from '@/data/cooks';
import {normalizeIngredient} from '@/data/ingredients';
import {blankEpisode,youtubeVideoId} from '@/data/podcasts';
import {pueblaMunicipalities} from '@/data/puebla-municipalities';
import {getMunicipalityRegion} from '@/data/puebla-regions';
import {publicRelations} from '@/lib/public-projection';

// Revisions have different JSON structures for each domain; only explicit projections below leave this boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row=Record<string,any>;
const array=(value:unknown):Row[]=>Array.isArray(value)?value:[];
const name=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function publicMedia(content:Row,type:'image/'|'audio/'){
 return array(content.archivos).filter(file=>String(file.tipo_mime).startsWith(type)&&/^https:\/\//.test(file.url)).map(file=>({id:file.id,name:file.nombre??'',url:file.url,type:file.tipo_mime,size:0,caption:file.texto_alternativo||file.descripcion||''}));
}
function domainRecords(rows:Row[]){
 const ingredientsById=new Map(rows.filter(row=>row.tipo==='ingrediente').map(row=>[row.registro_id,row.contenido.ficha.nombre]));
 const recipes:Row[]=[],cooks:Row[]=[],ingredients:Row[]=[],episodes:Row[]=[],markets:Row[]=[],relations:Row[]=[];
 const municipality=(row:Row)=>{const code=row.municipality_code??'';return {municipalityCode:code,municipality:pueblaMunicipalities.find(item=>item.code===code)?.name||array(row.contenido.territorios).find(item=>item.tipo==='municipio')?.nombre||'',region:getMunicipalityRegion(code)};};
 for(const row of rows){
  const c=row.contenido??{},f=c.ficha??{},d=c.detalle??{};
  const publicDate=new Date(row.publicado_en).toISOString();
  const base={id:row.registro_id,...municipality(row),updatedAt:publicDate,publishedAt:publicDate,source:'Fuente documental',sourceReference:array(c.fuentes).map(item=>item.cita).filter(Boolean).join('\n')};
  for(const edge of array(c.relaciones))relations.push({source:row.registro_id,target:edge.registro_id,type:edge.relacion,label:edge.descripcion||edge.relacion});
  if(row.tipo==='receta')recipes.push({...normalizeRecipe({...base,name:f.titulo,description:f.descripcion??'',status:'published',category:f.categoria??'',vigency:{practica_actual:'Se prepara actualmente',poco_frecuente:'Poco frecuente',en_desuso:'En desuso'}[f.vigencia_culinaria as string]??'',steps:array(d.pasos).map(item=>item.instrucciones),ingredients:array(d.ingredientes).map(item=>ingredientsById.get(item.ingrediente_id)).filter((item):item is string=>Boolean(item)),techniques:array(d.tecnicas).map(item=>item.nombre),occasions:f.ocasion?[f.ocasion]:[],photos:publicMedia(c,'image/'),audio:publicMedia(c,'audio/')}),publishedAt:publicDate});
  if(row.tipo==='persona')cooks.push({...normalizeCook({...base,name:f.nombre_publico,biography:f.semblanza??'',yearsExperience:f.experiencia_estimada_anios==null?'':String(f.experiencia_estimada_anios),status:'verified',consent:true,role:array(d.participaciones).join(', '),languages:array(d.lenguas) as unknown as string[],specialties:array(d.especialidades) as unknown as string[],recognitions:array(d.reconocimientos).map(item=>item.nombre||item.descripcion||'').filter(Boolean).join('\n'),photos:publicMedia(c,'image/')}),publishedAt:publicDate});
  if(row.tipo==='ingrediente')ingredients.push({...normalizeIngredient({...base,name:f.nombre,description:f.descripcion??'',status:'verified',localNames:array(d.nombres).map(item=>item.nombre),photos:publicMedia(c,'image/')}),publishedAt:publicDate});
  if(row.tipo==='episodio'){
   const youtube=array(d.enlaces).map(item=>youtubeVideoId(item.url)).find(Boolean);
   episodes.push({...blankEpisode(),...base,title:f.titulo,description:f.resumen??'',date:f.fecha_original??'',youtubeId:youtube??'',participants:array(d.creditos).map(item=>item.nombre).join(', '),status:'published',links:array(d.enlaces).filter(item=>/^https:\/\//.test(item.url)).map(item=>({label:item.plataforma,url:item.url})),audio:publicMedia(c,'audio/')});
  }
  if(row.tipo==='mercado')markets.push({...base,name:f.nombre,description:f.descripcion??'',type:f.tipo,status:'published',location:d.ubicacion??null});
 }
 return {recipes,cooks,ingredients,episodes,markets,relations};
}
/** The author's approved immutable revisions take priority over later panel copies. */
function merge(primary:Row[],secondary:Row[]){const keys=new Set(primary.flatMap(item=>[String(item.id),name(item.name||item.title)]));return [...primary,...secondary.filter(item=>!keys.has(String(item.id))&&!keys.has(name(item.name||item.title)))];}
export async function loadPublicCatalog(){
 requireDemo();
 const [domain,versions,editorial]=await Promise.all([
  pool.query(`SELECT f.*, (SELECT m.cvegeo FROM ogp.revision_territorios t LEFT JOIN ogp.localidades_puebla l ON l.territorio_id=t.territorio_id JOIN ogp.municipios_puebla m ON m.territorio_id=coalesce(l.municipio_id,t.territorio_id) WHERE t.revision_id=f.revision_id ORDER BY m.cvegeo LIMIT 1) AS municipality_code FROM ogp.v_fichas_publicas f ORDER BY f.publicado_en DESC,f.registro_id`),
  pool.query(`SELECT p.* FROM demo.public_catalog_versions p WHERE (p.kind<>'recipes' OR EXISTS(SELECT 1 FROM ogp.registros r WHERE r.id::text=p.record_id AND r.archivado_en IS NULL)) AND (p.kind<>'cooks' OR EXISTS(SELECT 1 FROM demo.catalog_forms c WHERE c.kind='cooks' AND c.id=p.record_id AND c.form->>'consent'='true')) ORDER BY p.published_at DESC,p.record_id`),
  pool.query("SELECT content FROM demo.editorial_content WHERE key='timeline'")
 ]);
 const original=domainRecords(domain.rows);
 const byKind=(kind:string)=>versions.rows.filter(row=>row.kind===kind).map(row=>({...row.snapshot,publishedAt:new Date(row.published_at).toISOString()}));
 const recipes=merge(original.recipes,byKind('recipes'));
 const ingredientRecords=merge(original.ingredients,byKind('ingredients'));
 const ingredients=publicRelations(ingredientRecords,recipes,ingredientRecords,original.markets);
 const cooks=publicRelations(merge(original.cooks,byKind('cooks')),recipes,ingredients,original.markets);
 const episodes=publicRelations(merge(original.episodes,byKind('episodes')),recipes,ingredients);
 const visible=new Set([...recipes,...ingredients,...cooks,...episodes,...original.markets].map(item=>String(item.id)));
 const relations=original.relations.filter(edge=>visible.has(edge.source)&&visible.has(edge.target));
 return {recipes,cooks,ingredients,episodes,markets:original.markets,timeline:Array.isArray(editorial.rows[0]?.content)?editorial.rows[0].content:[],relations};
}
