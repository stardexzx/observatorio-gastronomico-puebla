import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {pool,requireDemo} from './postgres';
import type {SessionUser} from '@/lib/auth/types';
import {legalInputSchema,legalWorkflowSchema,legalIdentifierSchema} from '@/lib/legal-validation';
import {createBlankLegalInput,legalClassificationOptions,legalSpecificFields,legalLinkKey,noLegalCapabilities,emptyLegalSummary,LEGAL_MAX_PDF_BYTES,LEGAL_MAX_DOCUMENTS,type LegalInput,type LegalRecord,type LegalCatalog,type LegalOptions,type LegalOption,type LegalLink,type LegalSource,type LegalDocument,type LegalCapabilities,type LegalPublicTargets,type LegalSummary} from '@/data/legal';

// PostgreSQL rows are converted explicitly at the private/public boundaries below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row=Record<string,any>;
type DB=Pick<PoolClient,'query'>;
export class LegalFailure extends Error {constructor(message:string,public status=400){super(message);this.name='LegalFailure';}}
const str=(value:unknown)=>value==null?'':String(value);
const date=(value:unknown)=>value instanceof Date?value.toISOString().slice(0,10):value?str(value).slice(0,10):'';
const iso=(value:unknown)=>value?new Date(value as string).toISOString():'';
const array=(value:unknown):Row[]=>Array.isArray(value)?value:[];
const nullable=(value:string)=>value.trim()||null;
const hrefFor=(kind:string,id:string,code?:string)=>kind==='municipalities'?'/mapa?municipio='+encodeURIComponent(code??id):(kind==='cooks'||kind==='producers'?'/cocineras/':kind==='recipes'?'/recetas/':kind==='ingredients'?'/ingredientes/':'/mercados/')+encodeURIComponent(id);
async function actor(db:DB,user:SessionUser):Promise<SessionUser>{
 legalIdentifierSchema.parse(user.id);
 const {rows:[row]}=await db.query(`SELECT u.id,u.nombre AS name,u.correo AS email,
 (SELECT r.codigo FROM ogp.usuario_roles ur JOIN ogp.roles r ON r.id=ur.rol_id AND r.activo
 WHERE ur.usuario_id=u.id AND r.codigo IN ('administrador','revisor','capturista')
 ORDER BY CASE r.codigo WHEN 'administrador' THEN 0 WHEN 'revisor' THEN 1 ELSE 2 END LIMIT 1) AS role
 FROM ogp.usuarios u WHERE u.id=$1 AND u.estado='activo'
 AND EXISTS(SELECT 1 FROM ogp.usuario_modulos m WHERE m.usuario_id=u.id AND m.modulo='instrumento')`,[user.id]);
 if(!row?.role)throw new LegalFailure('No tienes acceso a Protección legal.',403);
 return row as SessionUser;
}
async function transaction<T>(user:SessionUser,operation:(db:PoolClient,acting:SessionUser)=>Promise<T>):Promise<T>{
 requireDemo();const db=await pool.connect();
 try{await db.query('BEGIN');const acting=await actor(db,user);await db.query("SELECT set_config('ogp.actor_id',$1,true)",[acting.id]);const result=await operation(db,acting);await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('COMMIT');return result;}
 catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
async function capturePermission(db:DB,user:SessionUser,id:string,action='editar'){
 if(user.role==='revisor')throw new LegalFailure('La cuenta de revisión no realiza capturas.',403);
 if(user.role==='administrador')await db.query(`INSERT INTO ogp.asignaciones_registro(registro_id,usuario_id,funcion) VALUES($1,$2,'captura') ON CONFLICT DO NOTHING`,[id,user.id]);
 await db.query("SELECT ogp.exigir_permiso($1,'instrumento',$2,$3)",[user.id,action,id]);
}
async function recordRow(db:DB,id:string,lock=false):Promise<Row>{
 legalIdentifierSchema.parse(id);
 const {rows:[row]}=await db.query(`SELECT i.*,t.codigo AS classification,r.creado_por,r.actualizado_en,r.archivado_en,
 coalesce(p.form,'{}'::jsonb) AS form,coalesce(p.notas_privadas,'') AS private_notes,coalesce(p.expediente_id,(SELECT x.expediente_id FROM ogp.expediente_instrumentos x WHERE x.instrumento_id=i.id ORDER BY x.expediente_id LIMIT 1)) AS expediente_id,
 e.estado_ultima_revision,e.ultima_revision_id,e.revision_publica_id,pub.publicado_en
 FROM ogp.instrumentos_legales i JOIN ogp.registros r ON r.id=i.id
 LEFT JOIN ogp.tipos_instrumento_legal t ON t.id=i.tipo_id
 LEFT JOIN ogp.instrumento_panel p ON p.instrumento_id=i.id
 LEFT JOIN ogp.v_estado_editorial e ON e.id=i.id
 LEFT JOIN ogp.publicaciones pub ON pub.registro_id=i.id AND pub.retirado_en IS NULL
 WHERE i.id=$1`+(lock?' FOR UPDATE OF i,r':''),[id]);
 if(!row)throw new LegalFailure('Instrumento no encontrado.',404);return row;
}
async function canRead(db:DB,user:SessionUser,row:Row){
 if(user.role==='capturista'){
 const {rows:[access]}=await db.query(`SELECT ($1::uuid=$2::uuid OR EXISTS(SELECT 1 FROM ogp.asignaciones_registro WHERE registro_id=$3 AND usuario_id=$1 AND funcion='captura')) AS allowed`,[user.id,row.creado_por,row.id]);
 if(!access.allowed)throw new LegalFailure('Solo puedes consultar tus capturas y las fichas asignadas.',403);
 }
}
async function capabilities(db:DB,user:SessionUser,row:Row):Promise<LegalCapabilities>{
 if(row.archivado_en)return {...noLegalCapabilities};
 const {rows:[p]}=await db.query(`SELECT ogp.tiene_permiso($1,'instrumento','editar',$2) AS edit,
 ogp.tiene_permiso($1,'instrumento','enviar',$2) AS submit,
 ogp.tiene_permiso($1,'instrumento','validar',$2) AS review,
 ogp.tiene_permiso($1,'instrumento','publicar',$2) AS publish,
 ogp.tiene_permiso($1,'instrumento','retirar',$2) AS withdraw`,[user.id,row.id]);
 const admin=user.role==='administrador',capture=user.role!=='revisor',editable=row.estado_ultima_revision!=='en_revision';
 return {edit:capture&&editable&&(admin||p.edit),submit:capture&&editable&&(admin||p.submit),review:p.review&&row.estado_ultima_revision==='en_revision',publish:p.publish&&row.estado_ultima_revision==='validado',withdraw:p.withdraw&&Boolean(row.revision_publica_id),archive:capture&&(admin||p.edit)};
}
async function options(db:DB):Promise<LegalOption[]>{
 const {rows}=await db.query(`
 SELECT 'recipes' AS kind,'ogp' AS origin,x.id::text,x.titulo::text AS name,NULL::text AS municipality_code FROM ogp.recetas_documentadas x JOIN ogp.registros r ON r.id=x.id AND r.archivado_en IS NULL
 UNION ALL SELECT 'ingredients','ogp',x.id::text,x.nombre::text,NULL FROM ogp.ingredientes x JOIN ogp.registros r ON r.id=x.id AND r.archivado_en IS NULL
 UNION ALL SELECT 'cooks','ogp',x.id::text,x.nombre_publico::text,NULL FROM ogp.personas x JOIN ogp.registros r ON r.id=x.id AND r.archivado_en IS NULL
 UNION ALL SELECT 'producers','ogp',x.id::text,x.nombre_publico::text,NULL FROM ogp.personas x JOIN ogp.registros r ON r.id=x.id AND r.archivado_en IS NULL WHERE EXISTS(SELECT 1 FROM ogp.persona_tipos_participacion p JOIN ogp.tipos_participacion t ON t.id=p.participacion_id AND t.codigo='produccion' WHERE p.persona_id=x.id)
 UNION ALL SELECT 'markets','ogp',x.id::text,x.nombre::text,NULL FROM ogp.mercados x JOIN ogp.registros r ON r.id=x.id AND r.archivado_en IS NULL
 UNION ALL SELECT 'municipalities','ogp',m.territorio_id::text,t.nombre::text,m.cvegeo FROM ogp.municipios_puebla m JOIN ogp.territorios t ON t.id=m.territorio_id
 UNION ALL SELECT kind,'panel',id,form->>'name',coalesce(form->>'municipalityCode','') FROM demo.catalog_forms WHERE kind IN ('cooks','ingredients')
 ORDER BY kind,name,id`);
 return rows.map(r=>({kind:r.kind,origin:r.origin,id:r.id,name:r.name,href:hrefFor(r.kind,r.id,r.municipality_code),...(r.municipality_code?{municipalityCode:r.municipality_code}:{})}));
}
export async function readLegalOptions(user:SessionUser):Promise<LegalOptions>{requireDemo();await actor(pool,user);return {options:await options(pool)};}
async function sourceRows(db:DB,id:string):Promise<LegalSource[]>{
 const {rows}=await db.query(`SELECT f.*,x.afirmacion,x.apartado FROM ogp.instrumento_fuentes x JOIN ogp.fuentes f ON f.id=x.fuente_id WHERE x.instrumento_id=$1 ORDER BY f.creado_en,f.id`,[id]);
 return rows.map(r=>({id:r.id,title:r.titulo,reference:r.referencia,authority:str(r.autor_institucion),url:str(r.url),publicationDate:date(r.fecha_original),consultedAt:date(r.fecha_consulta),publicCitation:str(r.cita_publica),claim:r.afirmacion,section:str(r.apartado),visibility:r.visibilidad}));
}
async function linkRows(db:DB,id:string,available?:LegalOption[]):Promise<LegalLink[]>{
 const {rows}=await db.query(`
 SELECT 'recipes' AS kind,'ogp' AS origin,receta_id::text AS id,alcance AS scope,fuente_id::text AS source_id FROM ogp.instrumento_recetas WHERE instrumento_id=$1
 UNION ALL SELECT 'ingredients','ogp',ingrediente_id::text,alcance,fuente_id::text FROM ogp.instrumento_ingredientes WHERE instrumento_id=$1
 UNION ALL SELECT kind,'ogp',persona_id::text,alcance,fuente_id::text FROM ogp.instrumento_personas WHERE instrumento_id=$1
 UNION ALL SELECT 'markets','ogp',mercado_id::text,alcance,fuente_id::text FROM ogp.instrumento_mercados WHERE instrumento_id=$1
 UNION ALL SELECT 'municipalities','ogp',territorio_id::text,coalesce(descripcion_publica,tipo_vinculo),fuente_id::text FROM ogp.instrumento_territorios WHERE instrumento_id=$1
 UNION ALL SELECT 'cooks','panel',cocinera_id,alcance,fuente_id::text FROM ogp.instrumento_cocineras_panel WHERE instrumento_id=$1
 UNION ALL SELECT 'ingredients','panel',ingrediente_id,alcance,fuente_id::text FROM ogp.instrumento_ingredientes_panel WHERE instrumento_id=$1 ORDER BY kind,origin,id`,[id]);
 const opts=available??await options(db),lookup=new Map(opts.map(o=>[o.kind+':'+o.origin+':'+o.id,o]));
 return rows.flatMap(r=>{const o=lookup.get(r.kind+':'+r.origin+':'+r.id);return o?[{...o,scope:r.scope,sourceId:r.source_id}]:[];});
}
async function documentRows(db:DB,id:string):Promise<LegalDocument[]>{
 const {rows}=await db.query(`SELECT a.*,b.sha256,x.fuente_id FROM ogp.instrumento_pdf_adjuntos x JOIN ogp.legal_pdf_blobs b ON b.archivo_id=x.archivo_id AND b.instrumento_id=x.instrumento_id JOIN ogp.archivos a ON a.id=x.archivo_id WHERE x.instrumento_id=$1 ORDER BY x.orden,a.id`,[id]);
 const local:LegalDocument[]=rows.map(r=>({id:r.id,name:r.nombre,size:r.tamano_bytes==null?null:Number(r.tamano_bytes),sha256:r.sha256,uploadedAt:iso(r.creado_en),visibility:r.visibilidad,license:str(r.licencia),...(r.fuente_id?{sourceId:r.fuente_id}:{}),url:'/api/legal/documents/'+r.id}));
 const external=await db.query(`SELECT a.* FROM ogp.instrumento_archivos x JOIN ogp.archivos a ON a.id=x.archivo_id WHERE x.instrumento_id=$1 AND a.tipo_mime='application/pdf' AND a.url_publica IS NOT NULL ORDER BY x.orden,a.id`,[id]);
 return [...new Map([...local,...external.rows.map(r=>({id:r.id,name:r.nombre,size:r.tamano_bytes==null?null:Number(r.tamano_bytes),sha256:'',uploadedAt:iso(r.creado_en),visibility:r.visibilidad,license:str(r.licencia),url:r.url_publica}))].map(document=>[document.id,document])).values()];
}
function formFields(value:unknown):LegalInput{
 const defaults=createBlankLegalInput();const supplied=value&&typeof value==='object'?value as Row:{};
 // Explicit keys prevent old metadata and server fields entering a later public revision.
 for(const key of Object.keys(defaults) as (keyof LegalInput)[])if(supplied[key]!==undefined)Object.assign(defaults,{[key]:supplied[key]});
 return defaults;
}
async function workingRecord(db:DB,user:SessionUser,row:Row,available?:LegalOption[]):Promise<LegalRecord>{
 await canRead(db,user,row);
 const [sources,links,documents,caps,trace,dossier]=await Promise.all([
 sourceRows(db,row.id),linkRows(db,row.id,available),documentRows(db,row.id),capabilities(db,user,row),
 db.query(`SELECT e.id,e.accion,e.fecha,e.observaciones,u.nombre FROM ogp.eventos_editoriales e LEFT JOIN ogp.usuarios u ON u.id=e.usuario_id WHERE e.registro_id=$1 ORDER BY e.fecha DESC,e.id`,[row.id]),
 db.query(`SELECT e.* FROM ogp.expedientes_legales e JOIN ogp.registros r ON r.id=e.id AND r.archivado_en IS NULL WHERE e.id=$1 OR EXISTS(SELECT 1 FROM ogp.expediente_instrumentos x WHERE x.expediente_id=e.id AND x.instrumento_id=$2) ORDER BY (e.id=$1) DESC,e.id LIMIT 1`,[row.expediente_id,row.id])
 ]);
 const d=dossier.rows[0],f=formFields(row.form);
 const record:LegalRecord={...f,id:row.id,name:row.nombre_oficial,classification:legalClassificationOptions.some(x=>x.value===row.classification)?row.classification:'otro',authority:str(row.autoridad),officialReference:str(row.referencia_oficial),publicationDate:date(row.fecha_emision),validFrom:date(row.vigente_desde),validUntil:date(row.vigente_hasta),reviewDate:date(row.fecha_revision),scope:str(row.alcance),situation:row.situacion,sources,links,documents,documentIds:documents.map(d=>d.id),dossier:d?{id:d.id,title:d.titulo,folio:str(d.folio),requestDate:date(d.fecha_solicitud),state:d.estado_tramite}:null,privateNotes:row.private_notes,status:row.estado_ultima_revision??'borrador',published:Boolean(row.revision_publica_id)&&!row.archivado_en,publishedAt:row.publicado_en?iso(row.publicado_en):null,latestRevisionId:row.ultima_revision_id??null,updatedAt:iso(row.actualizado_en),createdBy:row.creado_por,trace:trace.rows.map(t=>({id:t.id,action:t.accion,date:iso(t.fecha),actor:t.nombre,notes:str(t.observaciones)})),capabilities:caps};
 if(record.status==='validado'){
  const changed=await validatedCaptureChanged(db,record);
  Object.assign(record,{hasUnsubmittedChanges:changed});
  if(changed)record.capabilities.publish=false;
 }
 return record;
}
export async function getLegalRecord(user:SessionUser,id:string):Promise<LegalRecord>{
 requireDemo();const acting=await actor(pool,user);return workingRecord(pool,acting,await recordRow(pool,id));
}


async function saveSources(db:DB,user:SessionUser,id:string,input:LegalSource[]):Promise<Map<string,string>>{
 const current=await sourceRows(db,id),byId=new Map(current.map(s=>[s.id,s]));
 const managed=await db.query('SELECT fuente_id FROM ogp.instrumento_fuentes_gestionadas WHERE instrumento_id=$1',[id]);
 const owned=new Set(managed.rows.map(r=>r.fuente_id));const map=new Map<string,string>();
 for(const [index,s] of input.entries()){
  const existing=byId.get(s.id);let sourceId=existing?.id;
  if(existing){
   const unchanged=Object.keys(existing).every(key=>str(existing[key as keyof LegalSource])===str(s[key as keyof LegalSource]));
   if(!unchanged&&!owned.has(existing.id))throw new LegalFailure('La fuente pertenece al catálogo compartido. Añade una fuente nueva para modificarla.',409);
   if(!unchanged)sourceId=undefined; // Copy on change preserves references and all earlier revisions.
  }else if(s.id&&/^[0-9a-f-]{36}$/i.test(s.id)){
   if((await db.query('SELECT id FROM ogp.fuentes WHERE id=$1',[s.id])).rowCount)throw new LegalFailure('La fuente ya existe en otro registro. Añade una fuente propia.',409);
  }
  if(!sourceId){
   sourceId=randomUUID();
   await db.query(`INSERT INTO ogp.fuentes(id,tipo_id,titulo,referencia,cita_publica,autor_institucion,fecha_original,precision_fecha,fecha_consulta,url,visibilidad,creado_por)
   VALUES($1,(SELECT id FROM ogp.tipos_fuente WHERE codigo='publicacion'),$2,$3,$4,$5,$6,CASE WHEN $6::date IS NULL THEN 'desconocida' ELSE 'exacta' END,coalesce($7::date,current_date),$8,$9,$10)`,
   [sourceId,s.title,s.reference||s.url||s.publicCitation,nullable(s.publicCitation),nullable(s.authority),nullable(s.publicationDate),nullable(s.consultedAt),nullable(s.url),s.visibility,user.id]);
   await db.query('INSERT INTO ogp.instrumento_fuentes_gestionadas(instrumento_id,fuente_id) VALUES($1,$2)',[id,sourceId]);
  }
  const key=s.id||'new-'+index;if(map.has(key))throw new LegalFailure('Las fuentes deben tener identificadores distintos.');
  map.set(key,sourceId);
 }
 await db.query('DELETE FROM ogp.instrumento_fuentes WHERE instrumento_id=$1',[id]);
 for(const [index,s] of input.entries())await db.query('INSERT INTO ogp.instrumento_fuentes(instrumento_id,fuente_id,afirmacion,apartado) VALUES($1,$2,$3,$4)',[id,map.get(s.id||'new-'+index),s.claim||s.title,nullable(s.section)]);
 return map;
}
async function saveLinks(db:DB,id:string,input:LegalLink[],sourceIds:Map<string,string>){
 const lookup=new Map((await options(db)).map(o=>[o.kind+':'+o.origin+':'+o.id,o]));
 const seen=new Set<string>();const normalized:LegalLink[]=[];
 for(const link of input){
  const key=legalLinkKey(link);if(seen.has(key))throw new LegalFailure('Una misma entidad no puede vincularse dos veces.');seen.add(key);
  const option=lookup.get(link.kind+':'+link.origin+':'+link.id);if(!option)throw new LegalFailure('Un vínculo no corresponde a una entidad disponible.',409);
  const sourceId=sourceIds.get(link.sourceId);if(!sourceId)throw new LegalFailure('Cada vínculo necesita una fuente de esta captura.');
  normalized.push({...option,scope:link.scope,sourceId});
 }
 const tables=['instrumento_recetas','instrumento_ingredientes','instrumento_personas','instrumento_mercados','instrumento_territorios','instrumento_cocineras_panel','instrumento_ingredientes_panel'];
 for(const table of tables)await db.query('DELETE FROM ogp.'+table+' WHERE instrumento_id=$1'+(table==='instrumento_territorios'?' AND territorio_id IN(SELECT territorio_id FROM ogp.municipios_puebla)':''),[id]);
 for(const link of normalized){
  if(link.kind==='municipalities')await db.query(`INSERT INTO ogp.instrumento_territorios(instrumento_id,territorio_id,tipo_vinculo,fuente_id,descripcion_publica) VALUES($1,$2,'aplicacion',$3,$4)`,[id,link.id,link.sourceId,link.scope]);
  else if(link.kind==='cooks'||link.kind==='producers'){
   if(link.origin==='panel')await db.query('INSERT INTO ogp.instrumento_cocineras_panel(instrumento_id,cocinera_id,alcance,fuente_id) VALUES($1,$2,$3,$4)',[id,link.id,link.scope,link.sourceId]);
   else await db.query('INSERT INTO ogp.instrumento_personas(instrumento_id,persona_id,kind,alcance,fuente_id) VALUES($1,$2,$3,$4,$5)',[id,link.id,link.kind,link.scope,link.sourceId]);
  }else{
   const target=link.kind==='recipes'?['instrumento_recetas','receta_id']:link.kind==='ingredients'?(link.origin==='panel'?['instrumento_ingredientes_panel','ingrediente_id']:['instrumento_ingredientes','ingrediente_id']):['instrumento_mercados','mercado_id'];
   await db.query('INSERT INTO ogp.'+target[0]+'(instrumento_id,'+target[1]+',alcance,fuente_id) VALUES($1,$2,$3,$4)',[id,link.id,link.scope,link.sourceId]);
  }
 }
 return normalized;
}
async function saveDossier(db:DB,user:SessionUser,id:string,input:LegalInput,previous:Row,sources:Map<string,string>):Promise<string|null>{
 const d=input.dossier;
 if(!d){if(previous.expediente_id)await db.query('DELETE FROM ogp.expediente_instrumentos WHERE instrumento_id=$1 AND expediente_id=$2',[id,previous.expediente_id]);return null;}
 let dossierId=previous.expediente_id as string|undefined;
 if(d.id&&d.id!==dossierId)throw new LegalFailure('El expediente no corresponde a esta captura.',409);
 if(dossierId){
  if(user.role==='administrador')await db.query(`INSERT INTO ogp.asignaciones_registro(registro_id,usuario_id,funcion) VALUES($1,$2,'captura') ON CONFLICT DO NOTHING`,[dossierId,user.id]);
  await db.query("SELECT ogp.exigir_permiso($1,'expediente','editar',$2)",[user.id,dossierId]);
  await db.query('SELECT id FROM ogp.registros WHERE id=$1 FOR UPDATE',[dossierId]);
  await db.query(`UPDATE ogp.expedientes_legales SET titulo=$2,tipo_id=(SELECT id FROM ogp.tipos_instrumento_legal WHERE codigo=$3),autoridad=$4,folio=$5,fecha_solicitud=$6,estado_tramite=$7 WHERE id=$1`,[dossierId,d.title,input.classification,nullable(input.authority),nullable(d.folio),nullable(d.requestDate),d.state]);
 }else{
  dossierId=(await db.query("SELECT ogp.crear_registro($1,'expediente') AS id",[user.id])).rows[0].id;
  await db.query(`INSERT INTO ogp.expedientes_legales(id,titulo,tipo_id,autoridad,folio,fecha_solicitud,estado_tramite) VALUES($1,$2,(SELECT id FROM ogp.tipos_instrumento_legal WHERE codigo=$3),$4,$5,$6,$7)`,[dossierId,d.title,input.classification,nullable(input.authority),nullable(d.folio),nullable(d.requestDate),d.state]);
 }
 await db.query('DELETE FROM ogp.expediente_instrumentos WHERE instrumento_id=$1 AND expediente_id=$2',[id,dossierId]);
 const sourceId=sources.values().next().value;
 if(sourceId)await db.query('INSERT INTO ogp.expediente_instrumentos(expediente_id,instrumento_id,fuente_id) VALUES($1,$2,$3)',[dossierId,id,sourceId]);
 return dossierId??null;
}
async function saveCapture(db:PoolClient,user:SessionUser,id:string,input:LegalInput,previous:Row){
 const sources=await saveSources(db,user,id,input.sources);
 await saveLinks(db,id,input.links,sources);
 const attached=await db.query('SELECT archivo_id,fuente_id FROM ogp.instrumento_pdf_adjuntos WHERE instrumento_id=$1 FOR UPDATE',[id]);
 const external=await db.query('SELECT archivo_id FROM ogp.instrumento_archivos WHERE instrumento_id=$1',[id]);
 const existing=new Set([...attached.rows,...external.rows].map(r=>r.archivo_id));
 for(const fileId of input.documentIds)if(!existing.has(fileId))throw new LegalFailure('Un documento no pertenece a esta captura.',409);
 // A form may detach documents, but approved revision attachments remain intact.
 await db.query('DELETE FROM ogp.instrumento_pdf_adjuntos WHERE instrumento_id=$1 AND NOT(archivo_id::text=ANY($2::text[]))',[id,input.documentIds]);
 await db.query("DELETE FROM ogp.instrumento_archivos x USING ogp.archivos a WHERE a.id=x.archivo_id AND x.instrumento_id=$1 AND a.tipo_mime='application/pdf' AND NOT(x.archivo_id::text=ANY($2::text[]))",[id,input.documentIds]);
 for(const a of attached.rows.filter(a=>input.documentIds.includes(a.archivo_id))){
  if(a.fuente_id){const mapped=sources.get(a.fuente_id);if(!mapped)throw new LegalFailure('Conserva la fuente del PDF o quita primero el documento.');if(mapped!==a.fuente_id)await db.query('UPDATE ogp.instrumento_pdf_adjuntos SET fuente_id=$3 WHERE instrumento_id=$1 AND archivo_id=$2',[id,a.archivo_id,mapped]);}
 }
 const dossierId=await saveDossier(db,user,id,input,previous,sources);
 const form={...input,sources:[],links:[],documentIds:[],dossier:null,privateNotes:''};
 await db.query(`UPDATE ogp.instrumentos_legales SET nombre_oficial=$2,tipo_id=(SELECT id FROM ogp.tipos_instrumento_legal WHERE codigo=$3),autoridad=$4,referencia_oficial=$5,fecha_emision=$6,vigente_desde=$7,vigente_hasta=$8,alcance=$9,situacion=$10,fecha_revision=$11 WHERE id=$1`,[id,input.name,input.classification,nullable(input.authority),nullable(input.officialReference),nullable(input.publicationDate),nullable(input.validFrom),nullable(input.validUntil),nullable(input.scope),input.situation,nullable(input.reviewDate)]);
 await db.query(`INSERT INTO ogp.instrumento_panel(instrumento_id,form,notas_privadas,expediente_id,actualizado_por) VALUES($1,$2,$3,$4,$5) ON CONFLICT(instrumento_id) DO UPDATE SET form=EXCLUDED.form,notas_privadas=EXCLUDED.notas_privadas,expediente_id=EXCLUDED.expediente_id,actualizado_por=EXCLUDED.actualizado_por,actualizado_en=now()`,[id,JSON.stringify(form),input.privateNotes,dossierId,user.id]);
 await db.query('UPDATE ogp.registros SET actualizado_en=now() WHERE id=$1',[id]);
 return {sourceIdChanges:Object.fromEntries(sources)};
}
export async function createLegalRecord(user:SessionUser,body:unknown):Promise<LegalRecord>{
 const input=legalInputSchema.parse(body);
 return transaction(user,async(db,acting)=>{
  if(acting.role==='revisor')throw new LegalFailure('La cuenta de revisión no realiza capturas.',403);
  const id=(await db.query("SELECT ogp.crear_registro($1,'instrumento') AS id",[acting.id])).rows[0].id;
  await db.query('INSERT INTO ogp.instrumentos_legales(id,nombre_oficial) VALUES($1,$2)',[id,input.name]);
  const changes=await saveCapture(db,acting,id,input,{});
  return {...(await workingRecord(db,acting,await recordRow(db,id))),...changes};
 });
}
export async function updateLegalRecord(user:SessionUser,id:string,body:unknown):Promise<LegalRecord>{
 const input=legalInputSchema.parse(body);
 return transaction(user,async(db,acting)=>{
  const previous=await recordRow(db,id,true);if(previous.archivado_en)throw new LegalFailure('La ficha está archivada.',409);
  if(previous.estado_ultima_revision==='en_revision')throw new LegalFailure('Concluye la revisión antes de editar la captura.',409);
  await capturePermission(db,acting,id);
  const changes=await saveCapture(db,acting,id,input,previous);
  return {...(await workingRecord(db,acting,await recordRow(db,id))),...changes};
 });
}
export async function archiveLegalRecord(user:SessionUser,id:string):Promise<LegalRecord>{
 return transaction(user,async(db,acting)=>{
  const row=await recordRow(db,id,true);await capturePermission(db,acting,id);
  if(row.revision_publica_id){
   await db.query("SELECT ogp.exigir_permiso($1,'instrumento','retirar',$2)",[acting.id,id]);
   await db.query("SELECT ogp.retirar_publicacion($1,$2,'Ficha archivada')",[acting.id,id]);
  }
  if(!row.archivado_en){await db.query('UPDATE ogp.registros SET archivado_en=now(),actualizado_en=now() WHERE id=$1',[id]);await db.query("INSERT INTO ogp.eventos_editoriales(registro_id,usuario_id,accion) VALUES($1,$2,'archivar')",[id,acting.id]);}
  return workingRecord(db,acting,await recordRow(db,id));
 });
}


function publicSource(source:LegalSource,visibility=source.visibility,citation=source.publicCitation):LegalSource{
 if(visibility==='restringido')return {id:source.id,title:'',reference:'',authority:'',url:'',publicationDate:'',consultedAt:'',publicCitation:citation,claim:'',section:'',visibility:'restringido'};
 return {id:source.id,title:source.title,reference:source.reference,authority:source.authority,url:source.url,publicationDate:source.publicationDate,consultedAt:source.consultedAt,publicCitation:citation,claim:source.claim,section:source.section,visibility:'publico'};
}
function publicFields(record:LegalRecord):Row{
 const f=formFields(record);
 const result:Row={};
 for(const key of Object.keys(f))if(!['privateNotes','sources','links','documentIds','dossier'].includes(key))result[key]=f[key as keyof LegalInput];
 result.specificFields=Object.fromEntries(legalSpecificFields[record.classification].filter(field=>typeof record.specificFields[field.key]==='string').map(field=>[field.key,record.specificFields[field.key]]));
 const sources=record.sources.filter(s=>s.visibility==='publico'||s.publicCitation.trim()).map(s=>publicSource(s));
 const sourceIds=new Set(sources.map(s=>s.id));
 const documents=record.documents.filter(d=>d.visibility==='publico'&&d.license.trim()).map(d=>({id:d.id,name:d.name,size:d.size,sha256:d.sha256,uploadedAt:d.uploadedAt,visibility:d.visibility,license:d.license,...(d.sourceId&&sourceIds.has(d.sourceId)?{sourceId:d.sourceId}:{}),url:d.url}));
 return {...result,id:record.id,sources,links:record.links.filter(l=>sourceIds.has(l.sourceId)).map(l=>({kind:l.kind,origin:l.origin,id:l.id,name:l.name,scope:l.scope,sourceId:l.sourceId,...(l.href?{href:l.href}:{}),...(l.municipalityCode?{municipalityCode:l.municipalityCode}:{})})),documents,documentIds:documents.map(d=>d.id),dossier:record.dossier?{id:record.dossier.id,title:record.dossier.title,folio:record.dossier.folio,requestDate:record.dossier.requestDate,state:record.dossier.state}:null};
}

function canonicalJson(value:unknown):string{
 if(value===null||typeof value!=='object')return JSON.stringify(value)??'null';
 if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
 const object=value as Record<string,unknown>;
 return '{'+Object.keys(object).sort().map(key=>JSON.stringify(key)+':'+canonicalJson(object[key])).join(',')+'}';
}
async function validatedCaptureChanged(db:DB,record:LegalRecord):Promise<boolean>{
 if(!record.latestRevisionId)return true;
 const {rows:[revision]}=await db.query('SELECT contenido_publico FROM ogp.registro_revisiones WHERE id=$1 AND registro_id=$2',[record.latestRevisionId,record.id]);
 const approved=revision?.contenido_publico?.detalle?.legal;
 // A native legacy revision has no full legal form to compare. Submit a legal
 // revision before publishing a capture that cannot be checked against that form.
 if(!approved||typeof approved!=='object'||Array.isArray(approved))return true;
 return canonicalJson(publicFields(record))!==canonicalJson(approved);
}

export async function applyLegalWorkflow(user:SessionUser,id:string,body:unknown):Promise<LegalRecord>{
 const input=legalWorkflowSchema.parse(body);
 return transaction(user,async(db,acting)=>{
  const row=await recordRow(db,id,true);await canRead(db,acting,row);
  if(row.archivado_en)throw new LegalFailure('La ficha está archivada.',409);
  if(input.action==='submit'){
   await capturePermission(db,acting,id,'enviar');
   if(row.estado_ultima_revision==='en_revision')throw new LegalFailure('Termina la revisión pendiente antes de enviar otra versión.',409);
   // All domain rows, sources, attachments and links are loaded under the record lock.
   await db.query('SELECT f.id FROM ogp.fuentes f JOIN ogp.instrumento_fuentes x ON x.fuente_id=f.id WHERE x.instrumento_id=$1 FOR SHARE OF f',[id]);
   await db.query('SELECT a.id FROM ogp.archivos a JOIN ogp.instrumento_pdf_adjuntos x ON x.archivo_id=a.id WHERE x.instrumento_id=$1 FOR SHARE OF a',[id]);
   const record=await workingRecord(db,acting,row);
   await db.query('SELECT ogp.enviar_instrumento_revision($1,$2,$3)',[acting.id,id,JSON.stringify(publicFields(record))]);
  }else if(input.action==='withdraw'){
   if(acting.role==='capturista')throw new LegalFailure('Solo administración o revisión pueden retirar publicaciones.',403);
   if(!row.revision_publica_id)throw new LegalFailure('No hay una publicación activa.',409);
   await db.query('SELECT ogp.retirar_publicacion($1,$2,$3)',[acting.id,id,input.notes?.trim()||'Retiro de publicación']);
  }else{
   if(acting.role==='capturista')throw new LegalFailure('Solo administración o revisión pueden evaluar y publicar.',403);
   const revisionId=input.revisionId||row.ultima_revision_id;
   if(!revisionId||revisionId!==row.ultima_revision_id)throw new LegalFailure('Selecciona la última revisión del instrumento.',409);
   if(input.action==='publish'){
    if(row.estado_ultima_revision!=='validado')throw new LegalFailure('La última revisión debe estar validada.',409);
    const capture=await workingRecord(db,acting,row);
    if(await validatedCaptureChanged(db,capture))throw new LegalFailure('Hay cambios posteriores a la validación; envía otra revisión.',409);
    await db.query('SELECT ogp.publicar_revision($1,$2)',[acting.id,revisionId]);
   }else{
    if(row.estado_ultima_revision!=='en_revision')throw new LegalFailure('La ficha no tiene una revisión pendiente.',409);
    await db.query('SELECT ogp.evaluar_revision($1,$2,$3,$4)',[acting.id,revisionId,input.action==='validate'?'validado':'correcciones',input.notes?.trim()||null]);
   }
  }
  await db.query('UPDATE ogp.registros SET actualizado_en=now() WHERE id=$1',[id]);
  return workingRecord(db,acting,await recordRow(db,id));
 });
}
export interface LegalDocumentUpload {bytes:Buffer;name:string;type:string;visibility:'publico'|'restringido';license:string;sourceId?:string;}
export async function uploadLegalDocument(user:SessionUser,id:string,input:LegalDocumentUpload):Promise<LegalRecord>{
 if(input.type!=='application/pdf'||!Buffer.isBuffer(input.bytes)||input.bytes.length<8||input.bytes.subarray(0,5).toString('ascii')!=='%PDF-')throw new LegalFailure('Selecciona un archivo PDF válido.');
 if(input.bytes.length>LEGAL_MAX_PDF_BYTES)throw new LegalFailure('Cada PDF admite hasta 20 MB.',413);
 if(!['publico','restringido'].includes(input.visibility)||typeof input.license!=='string'||input.visibility==='publico'&&!input.license.trim()||input.license.length>2000)throw new LegalFailure('Indica la visibilidad y las condiciones de uso del PDF.');
 const name=Array.from(str(input.name)).map(ch=>ch==='/'||ch.charCodeAt(0)===92||ch.charCodeAt(0)<32||ch.charCodeAt(0)===127?'_':ch).join('').trim().slice(0,240);
 if(!name||!name.toLowerCase().endsWith('.pdf'))throw new LegalFailure('El documento necesita un nombre PDF.');
 return transaction(user,async(db,acting)=>{
  const row=await recordRow(db,id,true);if(row.archivado_en)throw new LegalFailure('La ficha está archivada.',409);
  if(row.estado_ultima_revision==='en_revision')throw new LegalFailure('Concluye la revisión antes de modificar documentos.',409);
  await capturePermission(db,acting,id);
  const documents=await documentRows(db,id);if(documents.length>=LEGAL_MAX_DOCUMENTS)throw new LegalFailure('La ficha admite hasta '+LEGAL_MAX_DOCUMENTS+' documentos.',409);
  if(input.sourceId){legalIdentifierSchema.parse(input.sourceId);if(!(await db.query('SELECT 1 FROM ogp.instrumento_fuentes WHERE instrumento_id=$1 AND fuente_id=$2',[id,input.sourceId])).rowCount)throw new LegalFailure('La fuente del PDF debe pertenecer al instrumento.');}
  const fileId=randomUUID(),hash=createHash('sha256').update(input.bytes).digest('hex');
  await db.query(`INSERT INTO ogp.archivos(id,proveedor,clave_externa,nombre,tipo_mime,tamano_bytes,estado,visibilidad,licencia,creado_por) VALUES($1::uuid,'postgres_legal',$1::text,$2,'application/pdf',$3,'disponible',$4,$5,$6)`,[fileId,name,input.bytes.length,input.visibility,nullable(input.license),acting.id]);
  await db.query('INSERT INTO ogp.legal_pdf_blobs(archivo_id,instrumento_id,contenido,sha256) VALUES($1,$2,$3,$4)',[fileId,id,input.bytes,hash]);
  await db.query('INSERT INTO ogp.instrumento_pdf_adjuntos(instrumento_id,archivo_id,fuente_id,orden) VALUES($1,$2,$3,$4)',[id,fileId,input.sourceId||null,documents.length+1]);
  await db.query('UPDATE ogp.registros SET actualizado_en=now() WHERE id=$1',[id]);
  return workingRecord(db,acting,await recordRow(db,id));
 });
}
export async function detachLegalDocument(user:SessionUser,id:string,fileId:string):Promise<LegalRecord>{
 legalIdentifierSchema.parse(fileId);
 return transaction(user,async(db,acting)=>{
  const row=await recordRow(db,id,true);if(row.archivado_en)throw new LegalFailure('La ficha está archivada.',409);
  if(row.estado_ultima_revision==='en_revision')throw new LegalFailure('Concluye la revisión antes de modificar documentos.',409);
  await capturePermission(db,acting,id);
  const deleted=await db.query('DELETE FROM ogp.instrumento_pdf_adjuntos WHERE instrumento_id=$1 AND archivo_id=$2',[id,fileId]);
  const external=deleted.rowCount?null:await db.query("DELETE FROM ogp.instrumento_archivos x USING ogp.archivos a WHERE a.id=x.archivo_id AND x.instrumento_id=$1 AND x.archivo_id=$2 AND a.tipo_mime='application/pdf'",[id,fileId]);
  if(!deleted.rowCount&&!external?.rowCount)throw new LegalFailure('Documento no encontrado en la captura.',404);
  await db.query('UPDATE ogp.registros SET actualizado_en=now() WHERE id=$1',[id]);
  return workingRecord(db,acting,await recordRow(db,id));
 });
}
const localFileAuthorized=`a.estado='disponible' AND a.visibilidad='publico' AND coalesce(length(btrim(a.licencia)),0)>0
 AND NOT EXISTS(SELECT 1 FROM ogp.consentimiento_archivos_autorizados ca WHERE ca.archivo_id=a.id AND NOT ogp.consentimiento_valido(ca.consentimiento_id))`;
export async function loadLegalDocument(user:SessionUser|null,fileId:string):Promise<{bytes:Buffer;name:string;type:string}|null>{
 legalIdentifierSchema.parse(fileId);requireDemo();
 const {rows:[file]}=await pool.query('SELECT b.contenido,b.instrumento_id,a.nombre,a.tipo_mime FROM ogp.legal_pdf_blobs b JOIN ogp.archivos a ON a.id=b.archivo_id WHERE b.archivo_id=$1',[fileId]);if(!file)return null;
 if(user){
  try{const acting=await actor(pool,user);await canRead(pool,acting,await recordRow(pool,file.instrumento_id));return {bytes:file.contenido,name:file.nombre,type:'application/pdf'};}catch(error){if(!(error instanceof LegalFailure)||error.status!==403)throw error;}
 }
 const publicReference=await pool.query(`SELECT 1 FROM ogp.instrumento_revision_pdf p JOIN ogp.v_fichas_publicas f ON f.revision_id=p.revision_id AND f.tipo='instrumento' JOIN ogp.archivos a ON a.id=p.archivo_id WHERE p.archivo_id=$1 AND `+localFileAuthorized,[fileId]);
 return publicReference.rowCount?{bytes:file.contenido,name:file.nombre,type:'application/pdf'}:null;
}


async function approvedSummary(db:DB,records:LegalRecord[],targets:LegalPublicTargets):Promise<LegalSummary>{
 const ids=records.map(r=>r.id),allowedRecipes=new Set(targets.recipes.map(r=>r.id));
 const visibleLinkedRecipes=[...new Set(records.flatMap(r=>r.links.filter(l=>l.kind==='recipes'&&allowedRecipes.has(l.id)).map(l=>l.id)))];
 const {rows:[s]}=await db.query(`WITH legal AS(
 SELECT * FROM ogp.v_fichas_publicas WHERE tipo='instrumento' AND registro_id::text=ANY($1::text[])
 ),dossier_candidates AS(
 SELECT f.registro_id::text AS id,f.contenido#>>'{ficha,estado_tramite}' AS state,0 AS priority,f.publicado_en AS approved_at FROM ogp.v_fichas_publicas f WHERE f.tipo='expediente'
 UNION ALL SELECT l.contenido#>>'{detalle,legal,dossier,id}',l.contenido#>>'{detalle,legal,dossier,state}',1,l.publicado_en FROM legal l
 ),dossiers AS(
 SELECT DISTINCT ON(c.id) c.id,c.state FROM dossier_candidates c JOIN ogp.expedientes_legales e ON e.id::text=c.id JOIN ogp.registros r ON r.id=e.id AND r.archivado_en IS NULL ORDER BY c.id,c.priority,c.approved_at DESC
 )
 SELECT
 (SELECT count(*) FROM legal l WHERE l.contenido#>>'{ficha,situacion}'='vigente_documentada'
 AND (nullif(l.contenido#>>'{ficha,vigente_desde}','')::date IS NULL OR nullif(l.contenido#>>'{ficha,vigente_desde}','')::date<=current_date)
 AND (nullif(l.contenido#>>'{ficha,vigente_hasta}','')::date IS NULL OR nullif(l.contenido#>>'{ficha,vigente_hasta}','')::date>=current_date)) AS active,
 (SELECT count(DISTINCT d.registro_destino_id) FROM legal l JOIN ogp.revision_dependencias d ON d.revision_id=l.revision_id JOIN ogp.registros r ON r.id=d.registro_destino_id AND r.tipo='receta' WHERE d.registro_destino_id::text=ANY($2::text[])) AS protected_recipes,
 (SELECT count(DISTINCT m.territorio_id) FROM legal l JOIN ogp.revision_territorios t ON t.revision_id=l.revision_id LEFT JOIN ogp.localidades_puebla loc ON loc.territorio_id=t.territorio_id JOIN ogp.municipios_puebla m ON m.territorio_id=coalesce(loc.municipio_id,t.territorio_id)) AS covered_municipalities,
 (SELECT count(*) FROM ogp.municipios_puebla) AS municipality_total,
 (SELECT count(*) FROM dossiers) AS total,
 (SELECT count(*) FROM dossiers WHERE state='favorable') AS granted,
 (SELECT count(*) FROM dossiers WHERE state IN ('solicitado','requerimientos')) AS in_progress,
 (SELECT count(*) FROM dossiers WHERE state='evaluacion') AS evaluation,
 (SELECT count(*) FROM dossiers WHERE state='rechazado') AS rejected`,[ids,visibleLinkedRecipes]);
 return {...emptyLegalSummary,active:Number(s.active),protectedRecipes:Number(s.protected_recipes),coveredMunicipalities:Number(s.covered_municipalities),municipalityTotal:Number(s.municipality_total),total:Number(s.total),granted:Number(s.granted),inProgress:Number(s.in_progress),evaluation:Number(s.evaluation),rejected:Number(s.rejected),lastUpdates:records.slice(0,5).map(r=>({id:r.id,name:r.name,date:r.publishedAt??r.updatedAt}))};
}
export async function readPublicLegalCatalog(targets:LegalPublicTargets):Promise<LegalCatalog>{
 requireDemo();
 const [publicRows,sources,pdfs,dependencies,territories]=await Promise.all([
 pool.query(`SELECT f.*,t.codigo AS classification FROM ogp.v_fichas_publicas f LEFT JOIN ogp.tipos_instrumento_legal t ON t.id::text=f.contenido#>>'{ficha,tipo_id}' WHERE f.tipo='instrumento' ORDER BY f.publicado_en DESC,f.registro_id`),
 pool.query(`SELECT rf.*,f.visibilidad FROM ogp.v_fichas_publicas v JOIN ogp.revision_fuentes rf ON rf.revision_id=v.revision_id JOIN ogp.fuentes f ON f.id=rf.fuente_id WHERE v.tipo='instrumento'`),
 pool.query(`SELECT p.*,a.creado_en FROM ogp.v_fichas_publicas v JOIN ogp.instrumento_revision_pdf p ON p.revision_id=v.revision_id JOIN ogp.archivos a ON a.id=p.archivo_id WHERE v.tipo='instrumento' AND `+localFileAuthorized),
 pool.query(`SELECT d.*,r.tipo FROM ogp.v_fichas_publicas v JOIN ogp.revision_dependencias d ON d.revision_id=v.revision_id JOIN ogp.registros r ON r.id=d.registro_destino_id WHERE v.tipo='instrumento'`),
 pool.query(`SELECT rt.*,m.cvegeo FROM ogp.v_fichas_publicas v JOIN ogp.revision_territorios rt ON rt.revision_id=v.revision_id LEFT JOIN ogp.localidades_puebla l ON l.territorio_id=rt.territorio_id LEFT JOIN ogp.municipios_puebla m ON m.territorio_id=coalesce(l.municipio_id,rt.territorio_id) WHERE v.tipo='instrumento'`)
 ]);
 const targetMap=new Map<string,Row>();
 for(const kind of ['recipes','ingredients','cooks','markets'] as const)for(const item of targets[kind])targetMap.set(kind+':'+item.id,item);
 function authorizedLink(raw:Row):LegalLink|null{
  const kind=raw.kind==='producers'?'cooks':raw.kind;
  if(kind==='municipalities')return null;
  const target=targetMap.get(kind+':'+raw.id);
  if(!target||(target.publicOrigin&&target.publicOrigin!==raw.origin))return null;
  if(!['recipes','ingredients','cooks','markets'].includes(kind))return null;
  return {kind:raw.kind,origin:raw.origin,id:raw.id,name:target.name,scope:str(raw.scope),sourceId:str(raw.sourceId),href:hrefFor(raw.kind,raw.id),...(raw.municipalityCode?{municipalityCode:raw.municipalityCode}:{})};
 }
 const records:LegalRecord[]=publicRows.rows.map(row=>{
  const content=row.contenido as Row,f=content.ficha??{},snapshot=content.detalle?.legal as Row|undefined;
  const input=formFields(snapshot??{});
  const sourceItems=sources.rows.filter(s=>s.revision_id===row.revision_id);
  const sourceMap=new Map(sourceItems.map(s=>[s.fuente_id,s]));
  const publicSources:LegalSource[]=snapshot?array(snapshot.sources).flatMap(source=>{
   const live=sourceMap.get(source.id);if(!live)return [];
   const s=source as LegalSource;
   const citation=live.visibilidad==='restringido'?s.publicCitation:str(live.cita_publica);
   if(live.visibilidad==='restringido'&&!citation.trim())return [];
   return [publicSource(s,live.visibilidad,citation)];
  }):sourceItems.map(s=>({id:s.fuente_id,title:'',reference:'',authority:'',url:'',publicationDate:'',consultedAt:'',publicCitation:str(s.cita_publica),claim:s.visibilidad==='publico'?str(s.afirmacion):'',section:s.visibilidad==='publico'?str(s.apartado):'',visibility:s.visibilidad}));
  const allowedSources=new Set(publicSources.map(s=>s.id));
  const local:LegalDocument[]=pdfs.rows.filter(p=>p.revision_id===row.revision_id).map(p=>({id:p.archivo_id,name:p.nombre,size:Number(p.tamano_bytes),sha256:p.sha256,uploadedAt:iso(p.creado_en),visibility:'publico',license:p.licencia,url:'/api/legal/documents/'+p.archivo_id}));
  const external:LegalDocument[]=array(content.archivos).filter(a=>a.tipo_mime==='application/pdf').map(a=>({id:a.id,name:a.nombre,size:null,sha256:'',uploadedAt:'',visibility:'publico',license:str(a.licencia),url:a.url}));
  const approvedDocuments=new Map([...local,...external].map(d=>[d.id,d]));
  const documents=snapshot?array(snapshot.documents).flatMap(d=>{const current=approvedDocuments.get(d.id);return current?[{...current,...(allowedSources.has(d.sourceId)?{sourceId:d.sourceId}:{})}]:[];}):[...local,...external];
  const frozenTerritories=territories.rows.filter(t=>t.revision_id===row.revision_id&&t.cvegeo);
  let links:LegalLink[];
  if(snapshot){
   links=array(snapshot.links).flatMap(l=>{
    if(!allowedSources.has(l.sourceId))return [];
    if(l.kind==='municipalities'){
     const territory=frozenTerritories.find(t=>t.territorio_id===l.id);if(!territory)return [];
     return [{kind:'municipalities',origin:'ogp',id:l.id,name:territory.nombre_en_revision,scope:str(l.scope),sourceId:l.sourceId,municipalityCode:territory.cvegeo,href:hrefFor('municipalities',l.id,territory.cvegeo)} as LegalLink];
    }
    const valid=authorizedLink(l);return valid?[valid]:[];
   });
  }else{
   links=dependencies.rows.filter(d=>d.revision_id===row.revision_id).flatMap(d=>{
    const kind=d.tipo==='receta'?'recipes':d.tipo==='ingrediente'?'ingredients':d.tipo==='persona'?'cooks':d.tipo==='mercado'?'markets':'';
    const link=authorizedLink({kind,origin:'ogp',id:d.registro_destino_id,scope:d.descripcion_publica,sourceId:''});return link?[link]:[];
   });
   const seen=new Set<string>();for(const t of frozenTerritories)if(!seen.has(t.territorio_id)){seen.add(t.territorio_id);links.push({kind:'municipalities',origin:'ogp',id:t.territorio_id,name:t.nombre_en_revision,scope:str(t.tipo_vinculo),sourceId:'',municipalityCode:t.cvegeo,href:hrefFor('municipalities',t.territorio_id,t.cvegeo)});}
  }
  const publicInput={} as Omit<LegalInput,'privateNotes'|'sources'|'links'|'documentIds'|'dossier'>;
  for(const key of Object.keys(input))if(!['privateNotes','sources','links','documentIds','dossier'].includes(key))Object.assign(publicInput,{[key]:input[key as keyof LegalInput]});
  // Legacy revisions have no legal form: adapt only documented native fields.
  if(!snapshot)publicInput.jurisdiction='otro';
  const classification=legalClassificationOptions.some(c=>c.value===row.classification)?row.classification:'otro';
  publicInput.specificFields=Object.fromEntries(legalSpecificFields[classification as keyof typeof legalSpecificFields].filter(field=>typeof input.specificFields[field.key]==='string').map(field=>[field.key,input.specificFields[field.key]]));
  const dossier=snapshot?.dossier&&typeof snapshot.dossier==='object'?{id:snapshot.dossier.id,title:str(snapshot.dossier.title),folio:str(snapshot.dossier.folio),requestDate:date(snapshot.dossier.requestDate),state:snapshot.dossier.state}:null;
  // Private capture notes and actor identities are intentionally absent from this DTO.
  return {...publicInput,id:row.registro_id,name:str(f.nombre_oficial),classification,authority:str(f.autoridad),officialReference:str(f.referencia_oficial),publicationDate:date(f.fecha_emision),validFrom:date(f.vigente_desde),validUntil:date(f.vigente_hasta),reviewDate:date(f.fecha_revision),situation:f.situacion??'no_determinada',scope:str(f.alcance),sources:publicSources,links,documents,documentIds:documents.map(d=>d.id),dossier,status:'publicado',published:true,publishedAt:iso(row.publicado_en),latestRevisionId:row.revision_id,updatedAt:iso(row.publicado_en),trace:[],capabilities:{...noLegalCapabilities}} as LegalRecord;
 });
 return {records,summary:await approvedSummary(pool,records,targets)};
}
export async function readLegalCatalog(user:SessionUser):Promise<LegalCatalog>{
 requireDemo();const acting=await actor(pool,user);
 const available=await options(pool);
 const {rows}=await pool.query(`SELECT i.id FROM ogp.instrumentos_legales i JOIN ogp.registros r ON r.id=i.id WHERE r.archivado_en IS NULL AND ($2<>'capturista' OR r.creado_por=$1 OR EXISTS(SELECT 1 FROM ogp.asignaciones_registro a WHERE a.registro_id=i.id AND a.usuario_id=$1 AND a.funcion='captura')) ORDER BY r.actualizado_en DESC,i.id`,[acting.id,acting.role]);
 const records:LegalRecord[]=[];for(const row of rows)records.push(await workingRecord(pool,acting,await recordRow(pool,row.id),available));
 // Team KPIs describe approved records, while its pipeline includes real working dossiers.
 const targets:LegalPublicTargets={recipes:[],ingredients:[],cooks:[],markets:[]};
 const {rows:visible}=await pool.query(`SELECT registro_id::text AS id,tipo,contenido FROM ogp.v_fichas_publicas WHERE tipo IN ('receta','ingrediente','persona','mercado')`);
 const normalizeName=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 for(const r of visible){const kind=r.tipo==='receta'?'recipes':r.tipo==='ingrediente'?'ingredients':r.tipo==='persona'?'cooks':'markets';const f=r.contenido.ficha??{};targets[kind].push({id:r.id,name:str(f.titulo??f.nombre_publico??f.nombre)});}
 const {rows:panel}=await pool.query(`SELECT p.kind,p.record_id,p.snapshot->>'name' AS name FROM demo.public_catalog_versions p WHERE p.kind IN ('recipes','cooks','ingredients') AND (p.kind<>'recipes' OR EXISTS(SELECT 1 FROM ogp.registros r WHERE r.id::text=p.record_id AND r.archivado_en IS NULL)) AND (p.kind<>'cooks' OR EXISTS(SELECT 1 FROM demo.catalog_forms c WHERE c.kind='cooks' AND c.id=p.record_id AND c.form->>'consent'='true')) ORDER BY p.published_at DESC,p.record_id`);
 for(const kind of ['recipes','cooks','ingredients'] as const){const existing=new Set(targets[kind].flatMap(r=>[r.id,normalizeName(r.name)]));for(const r of panel.filter(p=>p.kind===kind))if(!existing.has(r.record_id)&&!existing.has(normalizeName(str(r.name))))targets[kind].push({id:r.record_id,name:str(r.name)});}
 const published=await readPublicLegalCatalog(targets);
 const {rows:[pipeline]}=await pool.query(`SELECT count(*) AS total,count(*) FILTER(WHERE e.estado_tramite='favorable') AS granted,count(*) FILTER(WHERE e.estado_tramite IN ('solicitado','requerimientos')) AS in_progress,count(*) FILTER(WHERE e.estado_tramite='evaluacion') AS evaluation,count(*) FILTER(WHERE e.estado_tramite='rechazado') AS rejected FROM ogp.expedientes_legales e JOIN ogp.registros r ON r.id=e.id WHERE r.archivado_en IS NULL AND ($2<>'capturista' OR r.creado_por=$1 OR EXISTS(SELECT 1 FROM ogp.asignaciones_registro a WHERE a.registro_id=e.id AND a.usuario_id=$1 AND a.funcion='captura'))`,[acting.id,acting.role]);
 return {records,summary:{...published.summary,total:Number(pipeline.total),granted:Number(pipeline.granted),inProgress:Number(pipeline.in_progress),evaluation:Number(pipeline.evaluation),rejected:Number(pipeline.rejected)}};
}
