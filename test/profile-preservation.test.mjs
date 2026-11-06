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
const cookStorage = await import(moduleUrl((await readFile(new URL('../data/cook-storage.ts', import.meta.url), 'utf8')).replace('"@/data/cooks"', JSON.stringify(cookUrl))));
const ingredientStorage = await import(moduleUrl((await readFile(new URL('../data/ingredient-storage.ts', import.meta.url), 'utf8')).replace('"@/data/ingredients"', JSON.stringify(ingredientUrl))));
const originalWindow = globalThis.window;
after(() => {
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

test('cook storage preserves the complete memory profile and persistent media after rereading', () => {
  memoryStorage();
  cookStorage.writeCooks([normalizeCook(profile)]);
  assert.deepEqual(cookStorage.findCook(profile.id), normalizeCook(profile));
  cookStorage.upsertCook(normalizeCook({ ...profile, quote: 'Frase actualizada' }));
  const records = cookStorage.readCooks();
  assert.equal(records.length, 1);
  assert.equal(records[0].quote, 'Frase actualizada');
  assert.equal(records[0].photos[0].url, profile.photos[0].url);
  assert.equal(records[0].oralHistories[0].url, profile.oralHistories[0].url);
});

for (const [label, storage, key, read, write, upsert, normalize] of [
  ['cook', cookStorage, 'cookStorageKey', 'readCooks', 'writeCooks', 'upsertCook', normalizeCook],
  ['ingredient', ingredientStorage, 'ingredientStorageKey', 'readIngredients', 'writeIngredients', 'upsertIngredient', normalizeIngredient],
]) {
  test(`${label} storage reports malformed data without erasing or replacing it`, () => {
    const values = memoryStorage();
    const raw = '{registro incompleto';
    values.set(storage[key], raw);
    assert.throws(() => storage[read](), /datos originales se conservaron/i);
    assert.throws(() => storage[upsert](normalize({ id: 'new' })), /datos originales se conservaron/i);
    assert.equal(values.get(storage[key]), raw);
    values.set(storage[key], '{}');
    assert.throws(() => storage[read](), /datos originales se conservaron/i);
  });
  test(`${label} storage reports quota and access errors instead of returning a saved result`, () => {
    memoryStorage();
    window.localStorage.setItem = () => { throw new DOMException('Storage is full', 'QuotaExceededError'); };
    assert.throws(() => storage[write]([normalize({ id: 'saved' })]), /no se pudo guardar/i);
    assert.throws(() => storage[upsert](normalize({ id: 'saved' })), /no se pudo guardar/i);
    window.localStorage.getItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
    assert.throws(() => storage[read](), /no se puede acceder/i);
  });
}
