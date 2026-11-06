import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../data/podcasts.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { youtubeVideoId, blankEpisode, readEpisodes, saveEpisode, deleteEpisode } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('recognizes supported YouTube video links and rejects non-video or unsafe URLs', () => {
  const id = 'WD24I3yYQg4';
  for (const url of [`https://www.youtube.com/watch?v=${id}&list=abc`, `https://youtu.be/${id}?t=4`, `https://m.youtube.com/shorts/${id}`, `https://youtube.com/live/${id}`, `https://music.youtube.com/watch?v=${id}`]) assert.equal(youtubeVideoId(url), id);
  for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=WD24I3yYQg4', 'https://youtube.com@evil.test/watch?v=WD24I3yYQg4', 'https://youtube.com/playlist?list=abc', 'https://youtu.be/invalid', 'not a url']) assert.equal(youtubeVideoId(url), null);
});

test('persists new episodes, edits them without duplication, and protects existing records on failures', () => {
  const store = new Map();
  globalThis.window = {localStorage: {getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value)}};
  assert.deepEqual(readEpisodes(), []);
  const draft = saveEpisode({...blankEpisode(), title:'Episodio de prueba', youtubeId:'WD24I3yYQg4', recipeIds:['REC-001']});
  assert.ok(draft.id);
  assert.equal(readEpisodes()[0].status, 'draft');
  const published = saveEpisode({...draft, description:'Descripción', status:'published'});
  assert.equal(readEpisodes().length, 1);
  assert.equal(readEpisodes()[0].status, 'published');
  assert.deepEqual(readEpisodes()[0].recipeIds, ['REC-001']);
  assert.throws(() => saveEpisode({...blankEpisode(), title:'Duplicado', youtubeId:published.youtubeId}), /ya está registrado/);
  assert.equal(readEpisodes().length, 1);
  window.localStorage.setItem = () => {throw new Error('QuotaExceededError');};
  assert.throws(() => saveEpisode({...published, title:'Cambio no guardado'}), /QuotaExceededError/);
  assert.equal(readEpisodes()[0].title, 'Episodio de prueba');
  store.set('observatorio-podcast-v1', '{broken');
  assert.throws(() => readEpisodes());
});


test('deletes only the selected episode, supports undo, and preserves records when storage fails', () => {
  const store = new Map();
  globalThis.window = {localStorage: {getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value)}};
  const first=saveEpisode({...blankEpisode(),title:'Primero',youtubeId:'WD24I3yYQg4'});
  const second=saveEpisode({...blankEpisode(),title:'Segundo',youtubeId:'abcdefghijk',status:'published'});
  const removed=deleteEpisode(first.id);
  assert.equal(removed.id,first.id);
  assert.deepEqual(readEpisodes().map(item=>item.id),[second.id]);
  assert.throws(()=>deleteEpisode('missing'),/No encontramos/);
  saveEpisode(removed);
  assert.equal(readEpisodes().length,2);
  const before=readEpisodes();
  const write=window.localStorage.setItem;
  window.localStorage.setItem=()=>{throw new Error('Storage blocked');};
  assert.throws(()=>deleteEpisode(first.id),/Storage blocked/);
  assert.deepEqual(readEpisodes(),before);
  window.localStorage.setItem=write;
  deleteEpisode(first.id);deleteEpisode(second.id);
  assert.deepEqual(readEpisodes(),[]);
});
