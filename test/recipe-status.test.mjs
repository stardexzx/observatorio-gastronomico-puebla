import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const {outputFiles} = await build({entryPoints:[`${root}data/recipe-status.ts`],bundle:true,format:'esm',platform:'node',write:false});
const {recipeDisplayStatus} = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);

test('publishing replaces the visible review or draft state without changing the working copy', () => {
  for (const status of ['draft', 'in-review']) {
    const recipe = {status, publicStatus:'published'};
    assert.equal(recipeDisplayStatus(recipe), 'published');
    assert.equal(recipe.status, status);
  }
});

test('withdrawal restores the working state and clears a previous published label', () => {
  assert.equal(recipeDisplayStatus({status:'in-review', publicStatus:'draft'}), 'in-review');
  assert.equal(recipeDisplayStatus({status:'draft', publicStatus:'draft'}), 'draft');
  assert.equal(recipeDisplayStatus({status:'published', publicStatus:'draft'}), 'draft');
  assert.equal(recipeDisplayStatus({status:'verified'}), 'verified');
});
