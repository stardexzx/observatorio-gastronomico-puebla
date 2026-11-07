import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
async function moduleAt(path) {
  const { outputFiles } = await build({ entryPoints: [`${root}${path}`], absWorkingDir: root, bundle: true, format: 'esm', platform: 'node', write: false, alias: { '@': root } });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
}
const [{ authorCatalogs, buildUnifiedCatalogs, buildKnowledgeGraph }, { planLegacyImport, legacyRecipeDraft, legacyCookDraft, readLegacyArchive }] = await Promise.all([moduleAt('lib/integration/records.ts'), moduleAt('lib/integration/legacy-transfer.ts')]);
const { ensureAuthorIngredient } = await moduleAt('lib/integration/ingredients.ts');

const canonical = () => authorCatalogs(
  [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Mole poblano', description: 'Descripción del autor', municipality: 'Puebla', municipalityCode: '21114', ingredients: ['Chile poblano'], informant: { name: 'Ana Pérez' } }],
  [{ id: 'COC-101', name: 'Ana Pérez', linkedRecipes: ['Mole poblano'], municipality: 'Puebla', languages: [] }],
  [{ id: 'ING-101', name: 'Chile poblano', municipality: 'Puebla' }],
);
const legacy = () => ({
  recetas: [{ id: '1', resource: 'recetas', n: 'Móle poblano', d: 'Descripción anterior', marketIds: ['1'], ingredientIds: ['ref-1'], personIds: ['1'] }, { id: '2', resource: 'recetas', n: 'Receta sin ficha actual' }],
  cocineras: [{ id: '1', resource: 'cocineras', n: 'Ana Perez', recipeIds: ['1'] }],
  ingredientes: [{ id: 'ref-1', resource: 'ingredientes', n: 'Chile poblano' }],
  mercados: [{ id: '1', resource: 'mercados', n: 'Mercado comunitario', recipeIds: ['1', '2'], personIds: ['1'], ingredientIds: ['ref-1'], prod: ['Producto conservado como texto'] }],
  'proteccion-legal': [{ id: '1', resource: 'proteccion-legal', n: 'Documento anterior' }],
});

test('author identity and fields win; legacy relations resolve by name without numeric recipe links', () => {
  const unified = buildUnifiedCatalogs(legacy(), canonical());
  assert.equal(unified.recetas.length, 1);
  assert.equal(unified.recetas[0].d, 'Descripción del autor');
  assert.deepEqual(unified.mercados[0].recipeIds, ['550e8400-e29b-41d4-a716-446655440000']);
  assert.deepEqual(unified.mercados[0].personIds, ['COC-101']);
  assert.deepEqual(unified.mercados[0].ingredientIds, ['ING-101']);
  assert.ok(unified.mercados[0].prod.includes('Producto conservado como texto'));
  assert.equal(unified.recetas[0].to, '/recetas/550e8400-e29b-41d4-a716-446655440000');
  for (const kind of ['recetas','cocineras','ingredientes']) {
    assert.equal(unified[kind][0].storage,'postgres');
    assert.equal(unified[kind][0].source,'database');
  }
  const emptied = buildUnifiedCatalogs(legacy(), authorCatalogs([], [], []));
  assert.equal(emptied.recetas.length, 0);
  assert.deepEqual(emptied.mercados[0].recipeIds, []);
});

test('the current graph namespaces colliding IDs and never includes stale targets or static recipes', () => {
  const unified = buildUnifiedCatalogs(legacy(), canonical());
  const graph = buildKnowledgeGraph(unified);
  assert.equal(new Set(graph.nodes.map((n) => n.id)).size, graph.nodes.length);
  assert.ok(graph.nodes.some((n) => n.id === 'mercados:1'));
  assert.ok(graph.nodes.some((n) => n.id === 'proteccion-legal:1'));
  assert.ok(!graph.nodes.some((n) => n.to === '/recetas/1'));
  assert.ok(graph.edges.length > 0);
  for (const edge of graph.edges) {
    assert.ok(graph.nodes.some((n) => n.id === edge.source));
    assert.ok(graph.nodes.some((n) => n.id === edge.target));
  }
  const focused = buildKnowledgeGraph(unified, 'recetas:550e8400-e29b-41d4-a716-446655440000');
  assert.ok(focused.nodes.length <= graph.nodes.length);
  assert.ok(focused.nodes.some((n) => n.t === 'rec'));
});

test('explicit import excludes samples, detects duplicates and reports required municipal data', () => {
  const archive = { records: [
    { id: '1', resource: 'recetas', n: 'MÓLE POBLANO', m: 'Puebla' },
    { id: 'sample', resource: 'recetas', n: 'Muestra', seeded: true },
    { id: '2', resource: 'recetas', n: 'Sopa documentada', m: 'Puebla de Zaragoza', d: 'Relato real', ing: [['Chile poblano', 'Una pieza']], fu: ['Cuaderno de la familia'] },
    { id: '3', resource: 'cocineras', n: 'Persona documentada', m: 'Lugar desconocido' },
    { id: '4', resource: 'mercados', n: 'Mercado no trasladado' },
  ] };
  const plan = planLegacyImport(archive, canonical());
  assert.equal(plan.length, 3);
  assert.equal(plan[0].duplicateId, '550e8400-e29b-41d4-a716-446655440000');
  assert.equal(plan[1].municipalityCode, '21114');
  assert.ok(plan[2].blocked.some((reason) => reason.includes('municipio')));
  const draft = legacyRecipeDraft(plan[1], archive);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.name, 'Sopa documentada');
  assert.deepEqual(draft.ingredients, ['Chile poblano']);
  assert.equal(draft.sourceReference, 'Cuaderno de la familia');
  assert.equal(draft.source, '');
  assert.deepEqual(draft.steps, []);
  assert.equal(draft.id, '');
});

test('person transfer preserves the requested profile fields without assigning verification or consent', () => {
  const archive = { records: [{ id: 'c1', resource: 'cocineras', n: 'Persona real', m: 'Cuetzalan del Progreso', q: 'Memoria de cocina', est: 12, bio: 'Biografía', languages: ['Náhuatl'], org: 'Colectivo', es: 'Cocina comunitaria', lineage: [{ label: 'Abuela' }], sourceReferences: ['Entrevista proporcionada'], oralRecords: [{ id: 'o1', title: 'Relato', date: '2024-04-10', duration: '14 min', url: 'data:audio/mpeg;base64,AAAA' }] }] };
  const [row] = planLegacyImport(archive, canonical());
  const draft = legacyCookDraft(row, archive);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.quote, 'Memoria de cocina');
  assert.equal(draft.studentCount, 12);
  assert.equal(draft.collective, 'Colectivo');
  assert.deepEqual(draft.establishments, ['Cocina comunitaria']);
  assert.deepEqual(draft.culinaryLineage, ['Abuela']);
  assert.equal(draft.oralHistories[0].url, 'data:audio/mpeg;base64,AAAA');
  assert.equal(draft.consent, false);
  assert.equal(draft.verifiedBy, '');
  assert.deepEqual(draft.sourceReferences, ['Entrevista proporcionada']);
});

test('reading a missing collection does not open, create or seed IndexedDB', async () => {
  let opens = 0;
  globalThis.indexedDB = { databases: async () => [], open: () => { opens++; throw new Error('Must not create a collection'); } };
  try {
    const archive = await readLegacyArchive();
    assert.equal(archive.exists, false);
    assert.deepEqual(archive.records, []);
    assert.equal(opens, 0);
  } finally { delete globalThis.indexedDB; }
});

test('browsers without database enumeration abort an attempted creation without seeding records', async () => {
  let aborted = false;
  globalThis.indexedDB = { open: () => {
    const request = { transaction: { abort() { aborted = true; queueMicrotask(() => request.onerror?.()); } } };
    queueMicrotask(() => request.onupgradeneeded?.());
    return request;
  } };
  try { const archive = await readLegacyArchive(); assert.equal(archive.exists, false); assert.equal(aborted, true); }
  finally { delete globalThis.indexedDB; }
});

test('market capture selects the database duplicate or persists a new draft with the server canonical ID', async () => {
  const values=new Map([['observatorio-ingredients-v1','{archivo anterior intacto']]);
  const previousWindow=globalThis.window,previousFetch=globalThis.fetch;
  globalThis.window={localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}};
  const stored=new Map([['ING-existing',{id:'ING-existing',name:'Chile poblano',description:'Descripción ya documentada',status:'verified'}]]);
  let writes=0,failWrites=false;
  globalThis.fetch=async(path,options={})=>{
    assert.equal(path,'/api/catalogs/ingredients');
    assert.equal(options.cache,'no-store');
    if(options.method==='GET')return Response.json({records:[...stored.values()]});
    assert.equal(options.method,'POST');
    assert.equal(options.headers['Content-Type'],'application/json');
    if(failWrites)return Response.json({error:'No se pudo guardar el ingrediente en la base de datos.'},{status:503});
    const record=JSON.parse(options.body);
    assert.equal(record.status,'draft');
    // IDs from the service are canonical, even if the client proposed another one.
    record.id=`ING-database-${++writes}`;
    stored.set(record.id,structuredClone(record));
    return Response.json({record},{status:201});
  };
  try {
    const duplicate=await ensureAuthorIngredient({name:'  CHÍLE POBLANO ',description:'Do not overwrite the author'});
    assert.equal(duplicate.id,'ING-existing');
    assert.equal(duplicate.description,'Descripción ya documentada');
    assert.equal(writes,0);
    const created=await ensureAuthorIngredient({name:' Producto documentado ',description:' Descripción proporcionada '});
    assert.equal(created.id,'ING-database-1');
    assert.equal(created.status,'draft');
    assert.equal(created.municipalityCode,'');
    assert.equal(created.municipality,'');
    assert.equal(created.name,'Producto documentado');
    assert.equal(created.description,'Descripción proporcionada');
    assert.equal(stored.get(created.id).name,created.name);
    const again=await ensureAuthorIngredient({name:'producto documentado',description:'Another description'});
    assert.equal(again.id,created.id);assert.equal(again.description,created.description);
    assert.equal(writes,1);assert.equal(stored.size,2);
    const unified=buildUnifiedCatalogs({mercados:[{id:'m1',n:'Mercado',resource:'mercados',ingredientIds:[created.id]}]},authorCatalogs([],[],[...stored.values()]));
    assert.deepEqual(unified.mercados[0].ingredientIds,[created.id]);
    assert.ok(unified.mercados[0].prod.includes('Producto documentado'));
    failWrites=true;
    await assert.rejects(ensureAuthorIngredient({name:'Producto no guardado'}),/No se pudo guardar/);
    assert.equal([...stored.values()].some(record=>record.name==='Producto no guardado'),false);
    assert.equal(values.size,1);
    assert.equal(values.get('observatorio-ingredients-v1'),'{archivo anterior intacto');
  } finally {
    globalThis.fetch=previousFetch;
    if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
  }
});
