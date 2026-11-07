import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const moduleUrl = (source) => {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
};
const cookUrl = moduleUrl(await readFile(new URL('../data/cooks.ts', import.meta.url), 'utf8'));
const ingredientUrl = moduleUrl(await readFile(new URL('../data/ingredients.ts', import.meta.url), 'utf8'));
const { normalizeCook, createBlankCook } = await import(cookUrl);
const { normalizeIngredient } = await import(ingredientUrl);
const transportUrl=moduleUrl(await readFile(new URL('../data/catalog-storage.ts',import.meta.url),'utf8'));
const cookStorage = await import(moduleUrl((await readFile(new URL('../data/cook-storage.ts', import.meta.url), 'utf8')).replace('"@/data/cooks"', JSON.stringify(cookUrl)).replace('"./catalog-storage"',JSON.stringify(transportUrl))));
const ingredientStorage = await import(moduleUrl((await readFile(new URL('../data/ingredient-storage.ts', import.meta.url), 'utf8')).replace('"@/data/ingredients"', JSON.stringify(ingredientUrl)).replace('"./catalog-storage"',JSON.stringify(transportUrl))));
const originalWindow = globalThis.window;
const originalFetch=globalThis.fetch;
after(() => {
  globalThis.fetch=originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

function memoryStorage() {
  const values = new Map();
  globalThis.window = { localStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } };
  return values;
}

const profile = {
  id: 'COC-real-1', name: 'Nombre proporcionado por la persona',
  biography: 'Semblanza autorizada', languages: ['Náhuatl', 'Español'],
  quote: 'Una memoria compartida', studentCount: 12, collective: 'Colectivo proporcionado',
  establishments: ['Establecimiento documentado'], linkedMarkets: ['Mercado documentado'],
  culinaryLineage: ['Abuela: cocina tradicional'],
  oralHistories: [{ id: 'ORAL-real-1', title: 'Memoria familiar', date: '2026-10-01', duration: '18:45', url: 'data:audio/mpeg;base64,SUQz' }],
  verifiedAt: '2026-10-02', verifiedBy: 'Persona verificadora',
  sourceReferences: ['Entrevista de campo, octubre de 2026', 'Referencia documental'],
  photos: [{ id: 'IMG-real-1', name: 'foto.png', url: 'data:image/png;base64,iVBORw==', type: 'image/png', size: 4 }],
};

test('author fields and complementary memory fields survive normalization without sharing mutable lists', () => {
  const record = normalizeCook(profile);
  for (const key of ['name', 'biography', 'quote', 'studentCount', 'collective', 'verifiedAt', 'verifiedBy']) assert.equal(record[key], profile[key]);
  for (const key of ['languages', 'establishments', 'linkedMarkets', 'culinaryLineage', 'oralHistories', 'sourceReferences', 'photos']) {
    assert.deepEqual(record[key], profile[key]);
    assert.notEqual(record[key], profile[key]);
  }
  assert.deepEqual(normalizeCook({}).oralHistories, []);
  assert.equal(createBlankCook().studentCount, 0);
});

test('optional profile fields tolerate malformed imported values without inventing records', () => {
  const record = normalizeCook({ quote: null, studentCount: -7, collective: 22, establishments: 'bad', linkedMarkets: ['Mercado', 23], culinaryLineage: null, oralHistories: [null, { title: 'Historia' }], sourceReferences: {} });
  assert.equal(record.quote, '');
  assert.equal(record.collective, '');
  assert.equal(record.studentCount, 0);
  assert.deepEqual(record.establishments, []);
  assert.deepEqual(record.linkedMarkets, ['Mercado']);
  assert.deepEqual(record.culinaryLineage, []);
  assert.deepEqual(record.sourceReferences, []);
  assert.deepEqual(record.oralHistories, [{ id: 'ORAL-1', title: 'Historia', date: '', duration: '', url: '' }]);
  assert.equal(normalizeCook({ studentCount: 4.8 }).studentCount, 4);
  assert.equal(normalizeCook({ studentCount: Number.NaN }).studentCount, 0);
});

function catalogServer(){
  const database={cooks:new Map(),ingredients:new Map()};
  let failure="";
  globalThis.fetch=async(path,options={})=>{
    const [, , ,kind,id]=String(path).split("/");
    if(failure)return Response.json({error:failure},{status:503});
    const records=database[kind];
    if(options.method==="GET")return Response.json({records:[...records.values()]});
    const record=JSON.parse(options.body);
    records.set(id||record.id,structuredClone(record));
    return Response.json({record});
  };
  return {database,fail:message=>{failure=message}};
}

test('database capture preserves memory fields and media across loading and editing',async()=>{
  const server=catalogServer();
  await cookStorage.loadCooks();
  assert.deepEqual(cookStorage.readCooks(),[]);
  await cookStorage.writeCooks([normalizeCook(profile)]);
  assert.deepEqual(await cookStorage.findCook(profile.id),normalizeCook(profile));
  await cookStorage.upsertCook(normalizeCook({...profile,quote:'Frase actualizada'}));
  const records=await cookStorage.loadCooks();
  assert.equal(records.length,1);
  assert.equal(records[0].quote,'Frase actualizada');
  assert.equal(records[0].photos[0].url,profile.photos[0].url);
  assert.equal(records[0].oralHistories[0].url,profile.oralHistories[0].url);
  assert.equal(server.database.cooks.size,1);
});

for(const [label,storage,key,read,load,upsert,normalize] of [
 ['cook',cookStorage,'cookStorageKey','readCooks','loadCooks','upsertCook',normalizeCook],
 ['ingredient',ingredientStorage,'ingredientStorageKey','readIngredients','loadIngredients','upsertIngredient',normalizeIngredient],
]){
 test(`${label} capture does not seed database or overwrite previous browser archives`,async()=>{
   const values=memoryStorage(),raw='{registro incompleto';values.set(storage[key],raw);
   const server=catalogServer();
   await storage[load]();assert.deepEqual(storage[read](),[]);
   assert.equal(values.get(storage[key]),raw);
   assert.equal(server.database[label==='cook'?'cooks':'ingredients'].size,0);
 });
 test(`${label} capture reports server failures and keeps last saved records`,async()=>{
   const server=catalogServer();await storage[load]();
   await storage[upsert](normalize({id:'saved',name:'Nombre documentado'}));
   const before=structuredClone(storage[read]());server.fail('No se pudo guardar en la base de datos');
   await assert.rejects(storage[upsert](normalize({id:'saved',name:'Cambio no guardado'})),/base de datos/);
   assert.deepEqual(storage[read](),before);
   await assert.rejects(storage[load](),/base de datos/);
   assert.deepEqual(storage[read](),before);
 });
}
