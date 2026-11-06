import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../data/recipes.ts', import.meta.url), 'utf8');
const {outputText} = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
const {normalizeRecipe, recipeSourceComplete} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('interviews can be completed without the removed reference and consultation fields', () => {
  const interview = normalizeRecipe({source:'Entrevista de campo', informant:{name:'Informante',interviewDate:'2026-10-29'}});
  assert.equal(recipeSourceComplete(interview), true);
  assert.equal(recipeSourceComplete({...interview,informant:{...interview.informant,name:'  '}}), false);
  assert.equal(recipeSourceComplete({...interview,informant:{...interview.informant,interviewDate:''}}), false);
});
test('existing recipes normalize without a link, and new links survive normalization', () => {
  assert.equal(normalizeRecipe({source:'Publicación'}).sourceUrl, '');
  const recipe = normalizeRecipe({source:'Publicación',sourceReference:'Libro, autora, página 7',sourceUrl:'https://example.org/recetario',consultationDate:'2026-10-29'});
  assert.equal(normalizeRecipe(recipe).sourceUrl, recipe.sourceUrl);
  assert.equal(recipeSourceComplete(recipe), true);
  assert.equal(recipeSourceComplete({...recipe,sourceReference:''}), false);
});
