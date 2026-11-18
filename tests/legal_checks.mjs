// All records and files below exist only in the disposable integration database.
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {build} from 'esbuild';

const compiled=await build({entryPoints:['data/legal.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createBlankLegalInput,legalInputFromRecord,legalLinkKey,legalDossierLabels}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].contents).toString('base64'));

export function legalTestPdf(label='ISOLATED TEST DOCUMENT') {
 const escaped=label.replace(/([\\()])/g,'\\$1');
 const stream='BT /F1 12 Tf 40 140 Td ('+escaped+') Tj ET\n';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'endstream'];
 let pdf='%PDF-1.4\n';const offsets=[0];
 for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const xref=Buffer.byteLength(pdf);pdf+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n';
 for(const offset of offsets.slice(1))pdf+=String(offset).padStart(10,'0')+' 00000 n \n';
 return Buffer.from(pdf+'trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
}

export async function runLegalChecks(context) {
 const {db,get,send,origin,admin,capture,review,recipeId,ingredientId,cookId,draftRecipeId,privateIngredientId,migrate}=context;
 const parse=async(response,status=200,label='legal request')=>{
  const text=await response.text();assert.equal(response.status,status,label+': '+text);
  try{return JSON.parse(text);}catch{assert.fail(label+': invalid JSON');}
 };
 const rejected=async(response,label)=>{
  const text=await response.text();assert.ok(response.status>=400&&response.status<500,label+': '+response.status+' '+text);
 };
 const publicCatalog=async()=>parse(await get('/api/public/legal'));
 const privateRecord=async(id,cookie=capture)=>(await parse(await get('/api/legal/'+id,cookie))).record;
 const action=async(id,action,cookie=review,notes='',revisionId)=>(await parse(await send('/api/legal/'+id+'/workflow',{action,notes,...(revisionId?{revisionId}:{})},cookie))).record;
 const save=async(record,cookie=capture)=>(await parse(await send('/api/legal/'+record.id,legalInputFromRecord(record),cookie,'PUT'))).record;
 const upload=async(id,bytes,name,visibility='publico',cookie=capture,sourceId,external=false,license='Autorización sintética exclusiva para pruebas aisladas')=>{
  const data=new FormData();data.append('file',new Blob([bytes],{type:'application/pdf'}),name);
  data.append('visibility',visibility);data.append('license',license);
  if(sourceId)data.append('sourceId',sourceId);
  return fetch(origin+'/api/legal/'+id+'/documents',{method:'POST',headers:{Cookie:cookie,Origin:external?'https://external.invalid':origin},body:data,redirect:'manual'});
 };
 const documentId=(record,name)=>{const document=record.documents.find(document=>document.name===name);assert.ok(document,'Document was persisted: '+name);return document.id;};
 const assertNoPrivate=body=>{
  const json=JSON.stringify(body);
  for(const secret of ['NOTA LEGAL PRIVADA','TITULO DE FUENTE LEGAL PRIVADA','REFERENCIA LEGAL PRIVADA','private-legal-source','EVIDENCIA LEGAL PRIVADA.pdf','CAMBIO LEGAL PENDIENTE'])assert.ok(!json.includes(secret),'Private legal information leaked: '+secret);
 };
 const initial=await publicCatalog();
 assert.ok(initial.records.some(record=>record.name==='Instrumento de integración'),'Existing original OGP legal snapshots remain visible');
 assert.equal((await get('/api/legal')).status,401);
 assert.equal((await get('/api/legal/options')).status,401);
 const privateResponse=await get('/api/legal',admin);
 assert.match(privateResponse.headers.get('cache-control')||'',/no-store/);
 await parse(privateResponse);
 const codes=(await db.query('SELECT codigo FROM ogp.tipos_instrumento_legal')).rows.map(row=>row.codigo);
 for(const code of ['do','ig','declaratoria','platillo_tipico','ley','reglamento','decreto','marca_colectiva','programa_gubernamental','otro'])assert.ok(codes.includes(code),'Classification exists: '+code);
 const minimal={...createBlankLegalInput(),name:'Borrador legal ajeno',classification:'ley'};
 await rejected(await send('/api/legal',minimal,review),'Reviewer cannot create a legal capture');
 await rejected(await send('/api/legal',{...minimal,classification:'fabricada'},admin),'Unknown classification rejected');
 await rejected(await send('/api/legal',minimal,admin,'POST',true),'Cross-origin legal mutation rejected');
 const privateCreated=await parse(await send('/api/legal',minimal,admin),201);
 const privateLegalId=privateCreated.record.id;
 assert.equal(privateCreated.record.published,false);
 assert.equal(privateCreated.record.status,'borrador');
 await rejected(await send('/api/legal/'+privateLegalId,minimal,capture,'PUT'),'Capture cannot edit another author');
 await rejected(await send('/api/legal/'+privateLegalId,{},capture,'DELETE'),'Capture cannot archive another author');
 await rejected(await send('/api/legal/'+privateLegalId+'/workflow',{action:'publish'},capture),'Capture cannot publish');
 assert.equal((await get('/api/public/legal/'+privateLegalId)).status,404);

 const sourceId=randomUUID(),privateSourceId=randomUUID();
 const input={...createBlankLegalInput(),name:'Instrumento legal temporal de integración',classification:'decreto',thematicAxes:['instrumentos_normativos','brechas_legales'],
  jurisdiction:'estatal',authority:'Autoridad sintética de integración',officialReference:'PRUEBA-AISLADA-001',
  publicationDate:'2026-01-01',validFrom:'2026-01-01',reviewDate:'2026-01-02',situation:'vigente_documentada',
  description:'Descripción documental sintética de pruebas.',scope:'Relación documentada exclusivamente para la prueba.',
  regulatedMatter:'Prueba aislada de interoperabilidad',beneficiaries:'Fichas temporales del entorno de pruebas',
  territorialScope:'Municipio sintético',responsibleAgency:'Equipo de integración',budget:'No documentado en esta prueba',
  operatingRules:'Reglas de prueba',safeguardingPlan:'Plan documental de prueba',complianceIndicators:'Indicador documental de prueba',
  effectiveness:'Evaluación cualitativa de prueba',operationalChallenges:'Reto operativo de prueba',legalGaps:'Brecha documental de prueba',
  linkedPolicies:'Política sintética de prueba',specificFields:{decreeNumber:'PRUEBA-001',publicationGazette:'Publicación sintética'},
  privateNotes:'NOTA LEGAL PRIVADA',dossier:{title:'Expediente temporal de integración',folio:'TEST-EXP-001',requestDate:'2026-01-01',state:'favorable'},
  sources:[{id:sourceId,title:'Fuente jurídica sintética',reference:'Documento de integración, sin valor oficial',authority:'Autoridad de prueba',
   url:'https://example.org/legal-test.pdf',publicationDate:'2026-01-01',consultedAt:'2026-01-02',publicCitation:'Cita pública de prueba aislada',claim:'Respaldo sintético del vínculo',section:'Prueba 1',visibility:'publico'},
   {id:privateSourceId,title:'TITULO DE FUENTE LEGAL PRIVADA',reference:'REFERENCIA LEGAL PRIVADA',authority:'Autoridad de evidencia reservada',
   url:'https://example.org/private-legal-source',publicationDate:'',consultedAt:'',publicCitation:'Referencia pública de evidencia reservada',claim:'',section:'',visibility:'restringido'}]};
 let response=await send('/api/legal',{...input,sources:[{...input.sources[0],url:'javascript:alert(1)'}]},capture);
 await rejected(response,'Executable source URL rejected');
 let record=(await parse(await send('/api/legal',input,capture),201)).record;
 const legalId=record.id;
 assert.equal(record.status,'borrador');assert.equal(record.published,false);
 assert.equal(record.capabilities.edit,true);assert.equal(record.capabilities.publish,false);
 await rejected(await send('/api/legal/'+legalId+'/workflow',{action:'publish'},review),'Review required before publication');
 await rejected(await send('/api/legal/'+legalId,legalInputFromRecord(record),review,'PUT'),'Reviewer does not capture');
 const publicSource=record.sources.find(source=>source.title==='Fuente jurídica sintética');
 assert.ok(publicSource,'Canonical source returned');
 const originalData=await parse(await get('/api/public/catalog'));
 const originalPerson=originalData.cooks.find(person=>person.name==='Persona de integración');
 assert.ok(originalPerson);
 await db.query("INSERT INTO ogp.persona_tipos_participacion SELECT $1,id FROM ogp.tipos_participacion WHERE codigo='produccion' ON CONFLICT DO NOTHING",[originalPerson.id]);
 const options=(await parse(await get('/api/legal/options',capture))).options;
 assert.ok(Array.isArray(options));assert.ok(!options.some(option=>option.kind==='establishments'),'No invented establishment registry');
 const municipality=options.find(option=>option.kind==='municipalities');
 const market=options.find(option=>option.kind==='markets'&&option.origin==='ogp');
 const producer=options.find(option=>option.kind==='producers'&&option.id===originalPerson.id);
 assert.ok(municipality,'Real municipality is selectable');assert.ok(market,'Original market is selectable');assert.ok(producer,'Producer uses the existing person identity');
 const linked=(kind,origin,id,name)=>({kind,origin,id,name,scope:'Alcance sintético documentado',sourceId:publicSource.id});
 record.links=[linked('recipes','ogp',recipeId,'Receta pública temporal'),linked('recipes','ogp',draftRecipeId,'RECETA BORRADOR PRIVADO'),
  linked('ingredients','panel',ingredientId,'Ingrediente público temporal'),linked('ingredients','panel',privateIngredientId,'INGREDIENTE PRIVADO'),
  linked('cooks','panel',cookId,'Persona pública temporal'),{...producer,scope:'Producción documentada de prueba',sourceId:publicSource.id},
  {...municipality,scope:'Ámbito documentado de prueba',sourceId:publicSource.id},{...market,scope:'Relación de prueba',sourceId:publicSource.id}];
 record=await save(record);
 assert.equal(new Set(record.links.map(legalLinkKey)).size,record.links.length,'Relationships have canonical, distinct identities');
 const duplicatePerson={...producer,kind:'cooks',scope:'Misma persona documentada',sourceId:publicSource.id};
 response=await send('/api/legal/'+legalId,{...legalInputFromRecord(record),links:[...record.links,duplicatePerson]},capture,'PUT');
 if(response.status===200)record=(await parse(response)).record;else await rejected(response,'Duplicate person is rejected or coalesced');
 assert.equal((await db.query('SELECT count(*)::int AS n FROM ogp.instrumento_personas WHERE instrumento_id=$1 AND persona_id=$2',[legalId,originalPerson.id])).rows[0].n,1,'Producer and cook share one relationship identity');
 response=await send('/api/legal/'+legalId,{...legalInputFromRecord(record),links:[...record.links,linked('markets','ogp',randomUUID(),'Destino inexistente')]},capture,'PUT');
 await rejected(response,'Dangling relationship rejected');
 response=await send('/api/legal/'+legalId,{...legalInputFromRecord(record),links:[...record.links,{...producer,scope:'',sourceId:publicSource.id}]},capture,'PUT');
 await rejected(response,'Relationship requires documented scope');
 record=await privateRecord(legalId);
 const publicPdf=legalTestPdf('PUBLIC DOCUMENT ONLY FOR ISOLATED TESTS');
 response=await upload(legalId,Buffer.from('not a PDF'),'invalid.pdf','publico',capture,publicSource.id);await rejected(response,'Non-PDF content rejected');
 response=await upload(legalId,publicPdf,'public-test.pdf','publico',capture,publicSource.id,true);assert.equal(response.status,403);
 const oversized=Buffer.alloc(20*1024*1024+1,65);Buffer.from('%PDF-1.4').copy(oversized);
 response=await upload(legalId,oversized,'oversized.pdf','publico',capture,publicSource.id);assert.equal(response.status,413,'Oversized PDF rejected');
 response=await upload(legalId,publicPdf,'unlicensed-public.pdf','publico',capture,publicSource.id,false,'');await rejected(response,'Public PDF requires an explicit license or authorization');
 response=await upload(legalId,publicPdf,'public-test.pdf','publico',capture,publicSource.id);
 record=(await parse(response,response.status===201?201:200,'PDF upload')).record;
 let publicDocumentId=documentId(record,'public-test.pdf');
 response=await upload(legalId,legalTestPdf('PRIVATE EVIDENCE'),'EVIDENCIA LEGAL PRIVADA.pdf','restringido',capture,publicSource.id,false,'');
 record=(await parse(response,response.status===201?201:200,'Private PDF upload')).record;
 const privateDocumentId=documentId(record,'EVIDENCIA LEGAL PRIVADA.pdf');
 assert.ok(!record.documents.find(document=>document.id===privateDocumentId).license,'A restricted document can retain unknown licensing without becoming public');
 assert.equal((await get('/api/legal/documents/'+publicDocumentId)).status,404,'Unapproved PDF is not public');
 assert.equal((await get('/api/legal/documents/'+privateDocumentId)).status,404);
 assert.equal((await get('/api/legal/documents/'+privateDocumentId,review)).status,200);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM ogp.legal_pdf_blobs WHERE instrumento_id=$1',[legalId])).rows[0].n,2);
 record=await action(legalId,'submit',capture);
 assert.equal(record.status,'en_revision');assert.ok(record.latestRevisionId);
 const firstRevision=record.latestRevisionId;
 await rejected(await send('/api/legal/'+legalId+'/workflow',{action:'validate'},capture),'Capture cannot validate');
 await rejected(await send('/api/legal/'+legalId+'/workflow',{action:'corrections',notes:''},review),'Corrections require observations');
 record=await action(legalId,'corrections',review,'Aclarar el alcance documental de prueba.');
 assert.equal(record.status,'correcciones');
 record.scope='Alcance sintético aclarado tras observaciones.';record=await save(record);
 record=await action(legalId,'submit',capture);
 assert.notEqual(record.latestRevisionId,firstRevision,'A correction creates a new immutable revision');
 record=await action(legalId,'validate',review);
 assert.equal(record.status,'validado');
 const reviewedRevision=record.latestRevisionId;
 const revisionHash=async id=>createHash('sha256').update((await db.query('SELECT contenido_publico::text AS content FROM ogp.registro_revisiones WHERE id=$1',[id])).rows[0].content).digest('hex');
 const reviewedHash=await revisionHash(reviewedRevision);
 record.scope='Alcance aclarado después de la validación; requiere una nueva revisión.';
 record=await save(record);
 assert.equal(record.status,'validado','Editing a validated capture does not invent a new editorial state');
 assert.equal(record.hasUnsubmittedChanges,true,'Working changes are distinguished from the validated snapshot');
 assert.equal(record.capabilities.publish,false,'A changed capture cannot publish an outdated validation');
 response=await send('/api/legal/'+legalId+'/workflow',{action:'publish',revisionId:reviewedRevision},review);
 assert.equal(response.status,409,await response.text());
 assert.equal(await revisionHash(reviewedRevision),reviewedHash,'Editing and rejected publication preserve the validated snapshot hash');
 record=await action(legalId,'submit',capture);
 assert.notEqual(record.latestRevisionId,reviewedRevision,'Validated edits require a new submitted revision');
 record=await action(legalId,'validate',review);
 assert.equal(record.hasUnsubmittedChanges,false,'Fresh validation matches the working capture');
 assert.equal(await revisionHash(reviewedRevision),reviewedHash,'The previous validated revision remains immutable');
 record=await action(legalId,'publish',review);
 assert.equal(record.published,true);assert.ok(record.publishedAt);
 const captureView=await privateRecord(legalId);
 assert.equal(captureView.capabilities.archive,false,'A capturista cannot archive an active publication without withdrawal permission');
 assert.equal((await send('/api/legal/'+legalId,{},capture,'DELETE')).status,403,'Archiving an active publication requires the existing withdrawal permission');
 const approved=await publicCatalog(),published=approved.records.find(item=>item.id===legalId);
 assert.ok(published);assert.equal(published.status,'publicado');assert.equal(published.name,input.name);
 assertNoPrivate(approved);assertNoPrivate(await parse(await get('/api/public/catalog')));
 assert.ok(!published.links.some(link=>link.id===draftRecipeId||link.id===privateIngredientId),'Private relationship targets stay private');
 assert.ok(published.links.some(link=>link.id===recipeId));
 assert.equal(published.documents.length,1);assert.equal(published.documents[0].id,publicDocumentId);
 assert.ok(!published.documentIds.includes(privateDocumentId),'Private document IDs are not exposed');
 const download=await get('/api/legal/documents/'+publicDocumentId);
 assert.equal(download.status,200);assert.match(download.headers.get('content-type')||'',/application\/pdf/);
 assert.equal(createHash('sha256').update(Buffer.from(await download.arrayBuffer())).digest('hex'),createHash('sha256').update(publicPdf).digest('hex'));
 assert.equal((await get('/api/legal/documents/'+privateDocumentId)).status,404);
 const effective=await parse(await get('/api/public/catalog'));
 assert.ok(effective.relations.some(edge=>(String(edge.source).includes(legalId)&&String(edge.target).includes(recipeId))||(String(edge.target).includes(legalId)&&String(edge.source).includes(recipeId))),'Public graph includes the same legal relationship');
 assert.equal(approved.summary.active,initial.summary.active+1);
 assert.equal(approved.summary.protectedRecipes,initial.summary.protectedRecipes+1);
 assert.equal(approved.summary.coveredMunicipalities,initial.summary.coveredMunicipalities+1);
 assert.equal(approved.summary.total,initial.summary.total+1,'Only actual dossiers are counted');
 assert.equal(approved.summary.granted,initial.summary.granted+1);
 assert.equal(approved.summary.municipalityTotal,(await db.query('SELECT count(*)::int AS n FROM ogp.municipios_puebla')).rows[0].n);

 // Each real dossier state persists on the same identity; only approved versions affect public KPIs.
 const dossierCases=[
  ['solicitado',{granted:0,inProgress:1,evaluation:0,rejected:0}],
  ['evaluacion',{granted:0,inProgress:0,evaluation:1,rejected:0}],
  ['requerimientos',{granted:0,inProgress:1,evaluation:0,rejected:0}],
  ['rechazado',{granted:0,inProgress:0,evaluation:0,rejected:1}],
  ['desistido',{granted:0,inProgress:0,evaluation:0,rejected:0}],
  ['no_documentado',{granted:0,inProgress:0,evaluation:0,rejected:0}],
  ['favorable',{granted:1,inProgress:0,evaluation:0,rejected:0}],
 ];
 assert.deepEqual(Object.keys(legalDossierLabels).sort(),dossierCases.map(([state])=>state).sort(),'All seven dossier states are exercised');
 const dossierId=record.dossier?.id;assert.ok(dossierId,'The captured dossier has a persistent identity');
 const dossierCount=(await db.query('SELECT count(*)::int AS n FROM ogp.expedientes_legales')).rows[0].n;
 const auditCount=async()=>(await db.query("SELECT count(*)::int AS n FROM ogp.eventos_auditoria WHERE tabla_afectada='expedientes_legales' AND entidad_id=$1 AND accion='update' AND usuario_id=$2",[dossierId,record.createdBy])).rows[0].n;
 const initialAuditCount=await auditCount(),initialPipeline=(await parse(await get('/api/legal',admin))).summary;
 const initialPublicDossiers=(await publicCatalog()).summary;
 const assertDossierSummary=(summary,baseline,contribution,label)=>{
  assert.equal(summary.total,baseline.total,label+': changing a state does not create another dossier');
  for(const key of ['granted','inProgress','evaluation','rejected'])assert.equal(summary[key],baseline[key]-(key==='granted'?1:0)+contribution[key],label+': '+key);
 };
 for(const [index,[state,contribution]] of dossierCases.entries()){
  const previousPublic=await publicCatalog(),previousPublished=previousPublic.records.find(item=>item.id===legalId);
  const previousRevision=record.latestRevisionId,previousHash=await revisionHash(previousRevision);
  record.dossier.state=state;record=await save(record);
  assert.equal(record.dossier.id,dossierId,state+': saving preserves the dossier identity');
  assert.equal(record.dossier.state,state,state+': save response has the requested state');
  const persisted=(await db.query('SELECT e.estado_tramite,p.expediente_id FROM ogp.instrumento_panel p JOIN ogp.expedientes_legales e ON e.id=p.expediente_id WHERE p.instrumento_id=$1',[legalId])).rows[0];
  assert.equal(persisted.expediente_id,dossierId,state+': panel keeps the same dossier');
  assert.equal(persisted.estado_tramite,state,state+': the SQL state persists');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM ogp.expedientes_legales')).rows[0].n,dossierCount,state+': no duplicate dossier is inserted');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM ogp.expediente_instrumentos WHERE expediente_id=$1 AND instrumento_id=$2',[dossierId,legalId])).rows[0].n,1,state+': the documented relationship remains unique');
  assert.equal(await auditCount(),initialAuditCount+index+1,state+': the authenticated update is audited');
  const teamCatalog=await parse(await get('/api/legal',admin));
  assert.equal(teamCatalog.records.find(item=>item.id===legalId).dossier.state,state,state+': administration reads the working state');
  assertDossierSummary(teamCatalog.summary,initialPipeline,contribution,state+' private pipeline');
  const pendingPublic=await publicCatalog();
  assert.deepEqual(pendingPublic.records.find(item=>item.id===legalId).dossier,previousPublished.dossier,state+': a working state does not replace the public dossier');
  assert.deepEqual(pendingPublic.summary,previousPublic.summary,state+': public statistics remain unchanged before approval');
  record=await action(legalId,'submit',capture);record=await action(legalId,'validate',review);
  assert.notEqual(record.latestRevisionId,previousRevision,state+': changing the dossier requires a fresh approved revision');
  assert.equal((await parse(await get('/api/public/legal/'+legalId))).record.dossier.state,previousPublished.dossier.state,state+': validation alone does not publish the state');
  assert.equal(await revisionHash(previousRevision),previousHash,state+': the previous public snapshot stays immutable');
  record=await action(legalId,'publish',review);
  const statePublic=await publicCatalog(),statePublished=statePublic.records.find(item=>item.id===legalId);
  assert.equal(statePublished.dossier.id,dossierId,state+': publication preserves the dossier identity');
  assert.equal(statePublished.dossier.state,state,state+': publication exposes the approved state');
  assertDossierSummary(statePublic.summary,initialPublicDossiers,contribution,state+' public pipeline');
 }
 assert.equal(record.dossier.state,'favorable','The shared legal fixture returns to its original dossier state');

 // SQL guards must protect published revisions and document bytes.
 await db.query('BEGIN');
 await db.query('SAVEPOINT legal_immutable');
 let immutable=false;
 try{await db.query("UPDATE ogp.registro_revisiones SET contenido_publico=contenido_publico||'{\"tampered\":true}'::jsonb WHERE id=$1",[record.latestRevisionId]);}catch{immutable=true;await db.query('ROLLBACK TO SAVEPOINT legal_immutable');}
 assert.equal(immutable,true,'Published revision is immutable');
 await db.query('SAVEPOINT legal_blob_immutable');immutable=false;
 try{await db.query("UPDATE ogp.legal_pdf_blobs SET contenido='changed'::bytea WHERE archivo_id=$1",[publicDocumentId]);}catch{immutable=true;await db.query('ROLLBACK TO SAVEPOINT legal_blob_immutable');}
 assert.equal(immutable,true,'PDF bytes are immutable');
 await db.query('ROLLBACK');

 // An unchanged validated revision can be withdrawn and republished.
 record=await action(legalId,'withdraw',review,'Retiro temporal de una versión sin cambios');
 assert.equal(record.published,false);assert.equal((await get('/api/public/legal/'+legalId)).status,404);
 assert.equal((await get('/api/legal/documents/'+publicDocumentId)).status,404);
 record=await action(legalId,'publish',review,'',record.latestRevisionId);
 assert.equal(record.published,true);assert.equal((await get('/api/legal/documents/'+publicDocumentId)).status,200);

 // Working edits, including removing an attachment, preserve the approved version.
 record=await privateRecord(legalId);record.name='CAMBIO LEGAL PENDIENTE';record=await save(record);
 await parse(await send('/api/legal/'+legalId+'/documents/'+publicDocumentId,{},capture,'DELETE'));
 assert.equal((await parse(await get('/api/public/legal/'+legalId))).record.name,input.name);
 assert.equal((await get('/api/legal/documents/'+publicDocumentId)).status,200,'Draft detach preserves approved document');
 record=await action(legalId,'withdraw',review,'Retiro temporal de prueba');
 assert.equal(record.published,false);assert.equal((await get('/api/public/legal/'+legalId)).status,404);
 assert.equal((await get('/api/legal/documents/'+publicDocumentId)).status,404);
 assert.equal(record.hasUnsubmittedChanges,true);
 response=await send('/api/legal/'+legalId+'/workflow',{action:'publish',revisionId:record.latestRevisionId},review);
 assert.equal(response.status,409,await response.text());
 record=await action(legalId,'submit',capture);
 record=await action(legalId,'validate',review);
 record=await action(legalId,'publish',review);
 assert.equal((await get('/api/legal/documents/'+publicDocumentId)).status,404,'Replacing approved version removes the old public document');
 assert.equal((await parse(await get('/api/public/legal/'+legalId))).record.documents.length,0);

 // Leave one approved, complete fixture for the browser, with both public/private evidence.
 record=await privateRecord(legalId);record.name=input.name;record=await save(record);
 const finalPdf=legalTestPdf('FINAL PUBLIC DOCUMENT FOR ISOLATED TESTS');
 response=await upload(legalId,finalPdf,'public-final-test.pdf','publico',capture,publicSource.id);
 record=(await parse(response,response.status===201?201:200,'Final PDF upload')).record;
 publicDocumentId=documentId(record,'public-final-test.pdf');
 record=await action(legalId,'submit',capture);record=await action(legalId,'validate',admin);record=await action(legalId,'publish',admin);
 const before=await parse(await get('/api/public/legal/'+legalId));
 const revisionCount=(await db.query('SELECT count(*)::int AS n FROM ogp.registro_revisiones WHERE registro_id=$1',[legalId])).rows[0].n;
 await rejected(await send('/api/legal/'+legalId,{},review,'DELETE'),'Reviewer cannot archive captures');
 await parse(await send('/api/legal/'+privateLegalId,{},admin,'DELETE'));
 assert.equal((await get('/api/public/legal/'+privateLegalId)).status,404);
 assert.equal((await db.query('SELECT archivado_en IS NOT NULL AS archived FROM ogp.registros WHERE id=$1',[privateLegalId])).rows[0].archived,true);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM ogp.instrumentos_legales WHERE id=$1',[privateLegalId])).rows[0].n,1,'Archive does not delete the legal instrument');
 if(migrate){await migrate();await migrate();}
 const after=await parse(await get('/api/public/legal/'+legalId));
 assert.equal(after.record.name,before.record.name);assert.equal(after.record.publishedAt,before.record.publishedAt);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM ogp.registro_revisiones WHERE registro_id=$1',[legalId])).rows[0].n,revisionCount);
 assert.equal((await get('/api/legal/documents/'+publicDocumentId)).status,200);
 assertNoPrivate(await publicCatalog());
 console.log('Legal API/SQL: original snapshots, CRUD/roles/origin, sources, canonical relationships, PDFs, sealed versions, privacy, seven persisted dossier states and approved KPIs, SQL indicators, archive and idempotent migrations passed.');
 return {legalId,legalName:input.name,legalRecipeId:recipeId,publicDocumentId,privateDocumentId,privateLegalId};
}
