import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../lib/public-projection.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { publicProjection, publicRelations } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('published recipes expose their preparation while withholding informants and captured attachments', () => {
  const input = {
    id: 'recipe-a', name: 'Preparación documentada', description: 'Descripción autorizada',
    source: 'Publicación', sourceReference: 'Referencia pública', sourceUrl: 'https://example.org/fuente',
    ingredients: ['Maíz'], steps: ['Cocer en comal.'], status: 'in-review',
    informant: { name: 'INFORMANTE PRIVADO', interviewDate: '2026-01-01' },
    photos: [{ url: 'https://example.org/FOTO-PRIVADA' }],
    audio: [{ url: 'https://example.org/AUDIO-PRIVADO' }],
    createdBy: 'ID-INTERNO', privateNotes: 'NOTA INTERNA', consultationDate: '2026-10-11',
  };
  const result = publicProjection('recipes', input);
  assert.equal(result.name, input.name);
  assert.deepEqual(result.steps, input.steps);
  assert.equal(result.sourceReference, input.sourceReference);
  assert.equal(result.sourceUrl, input.sourceUrl);
  assert.equal(result.status, 'published');
  for (const secret of ['INFORMANTE PRIVADO', 'FOTO-PRIVADA', 'AUDIO-PRIVADO', 'ID-INTERNO', 'NOTA INTERNA', '2026-10-11']) {
    assert.ok(!JSON.stringify(result).includes(secret));
  }
  assert.equal(result.informant.name, '');
  assert.deepEqual(result.photos, []);
  assert.deepEqual(result.audio, []);
});

test('public cook snapshots exclude internal verification, oral captures and private family references', () => {
  const result = publicProjection('cooks', {
    id: 'cook-a', name: 'Nombre autorizado', biography: 'Semblanza autorizada',
    quote: 'Saber compartido', sourceReference: 'Referencia pública',
    verifiedBy: 'REVISOR INTERNO', culinaryLineage: ['FAMILIAR SIN FICHA PÚBLICA'],
    oralHistories: [{ title: 'GRABACIÓN PRIVADA', url: 'https://example.org/privado' }],
    photos: [{ url: 'https://example.org/FOTO-PRIVADA' }],
    email: 'CORREO PRIVADO', phone: 'TELÉFONO PRIVADO', consentDocument: 'DOCUMENTO PRIVADO',
  });
  assert.equal(result.name, 'Nombre autorizado');
  assert.equal(result.biography, 'Semblanza autorizada');
  assert.equal(result.quote, 'Saber compartido');
  assert.equal(result.sourceReference, 'Referencia pública');
  for (const secret of ['REVISOR INTERNO', 'FAMILIAR SIN FICHA PÚBLICA', 'GRABACIÓN PRIVADA', 'FOTO-PRIVADA', 'CORREO PRIVADO', 'TELÉFONO PRIVADO', 'DOCUMENTO PRIVADO']) {
    assert.ok(!JSON.stringify(result).includes(secret));
  }
});

test('public source links accept only HTTPS URLs without embedded credentials', () => {
  for (const sourceUrl of ['javascript:alert(1)', 'data:text/html,contenido', '//example.org', 'http://example.org', 'https://user:password@example.org']) {
    assert.equal(publicProjection('recipes', { sourceUrl }).sourceUrl, '');
  }
  assert.equal(publicProjection('recipes', { sourceUrl: 'https://example.org/libro' }).sourceUrl, 'https://example.org/libro');
});

test('public relationships cannot reveal draft names or identifiers from other catalogs', () => {
  const privateNames = ['recipe-private', 'Nombre de receta borrador', 'ingredient-private', 'Nombre de ingrediente borrador', 'market-private', 'Nombre de mercado borrador'];
  const records = [{
    id: 'episode-a', linkedRecipes: ['recipe-public', 'Preparación pública', ...privateNames],
    recipeIds: ['recipe-public', 'recipe-private'], ingredientIds: ['ingredient-public', 'ingredient-private'],
    linkedMarkets: ['market-public', 'Mercado público', 'market-private', 'Nombre de mercado borrador'],
  }];
  const publicRecords = publicRelations(records,
    [{ id: 'recipe-public', name: 'Preparación pública' }],
    [{ id: 'ingredient-public', name: 'Ingrediente público' }],
    [{ id: 'market-public', name: 'Mercado público' }],
  );
  assert.deepEqual(publicRecords[0].recipeIds, ['recipe-public']);
  assert.deepEqual(publicRecords[0].ingredientIds, ['ingredient-public']);
  assert.deepEqual(publicRecords[0].linkedMarkets, ['market-public', 'Mercado público']);
  assert.deepEqual(publicRecords[0].linkedRecipes, ['recipe-public', 'Preparación pública']);
  for (const name of privateNames) assert.ok(!JSON.stringify(publicRecords).includes(name));
  assert.ok(records[0].recipeIds.includes('recipe-private'), 'filtering must preserve the private capture');
});
