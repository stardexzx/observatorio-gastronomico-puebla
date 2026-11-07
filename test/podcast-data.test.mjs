import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const transportSource=await readFile(new URL('../data/catalog-storage.ts',import.meta.url),'utf8');
const transportOutput=ts.transpileModule(transportSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const transportUrl=`data:text/javascript;base64,${Buffer.from(transportOutput).toString('base64')}`;
const source = (await readFile(new URL('../data/podcasts.ts', import.meta.url), 'utf8')).replace('"./catalog-storage"',JSON.stringify(transportUrl));
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { youtubeVideoId, blankEpisode, loadEpisodes, readEpisodes, saveEpisode, deleteEpisode } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('recognizes supported YouTube video links and rejects non-video or unsafe URLs', () => {
  const id = 'WD24I3yYQg4';
  for (const url of [`https://www.youtube.com/watch?v=${id}&list=abc`, `https://youtu.be/${id}?t=4`, `https://m.youtube.com/shorts/${id}`, `https://youtube.com/live/${id}`, `https://music.youtube.com/watch?v=${id}`]) assert.equal(youtubeVideoId(url), id);
  for (const url of ['javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=WD24I3yYQg4', 'https://youtube.com@evil.test/watch?v=WD24I3yYQg4', 'https://youtube.com/playlist?list=abc', 'https://youtu.be/invalid', 'not a url']) assert.equal(youtubeVideoId(url), null);
});

const originalFetch=globalThis.fetch;
after(()=>{globalThis.fetch=originalFetch});
function catalogServer(){
 const records=new Map();let failure='';
 globalThis.fetch=async(path,options={})=>{
  if(failure)return Response.json({error:failure},{status:503});
  const id=String(path).split('/')[4];
  if(options.method==='GET')return Response.json({records:[...records.values()]});
  if(options.method==='DELETE'){records.delete(id);return Response.json({deleted:true})}
  const record=JSON.parse(options.body);record.id=record.id||crypto.randomUUID();record.updatedAt=new Date().toISOString();
  records.set(record.id,structuredClone(record));return Response.json({record});
 };
 return {records,fail:value=>{failure=value}};
}
test('persists episodes in the shared database and protects existing records on failed writes',async()=>{
 const server=catalogServer();await loadEpisodes();assert.deepEqual(readEpisodes(),[]);
 const draft=await saveEpisode({...blankEpisode(),title:'Episodio de prueba',youtubeId:'WD24I3yYQg4',recipeIds:['REC-001']});
 assert.ok(draft.id);assert.equal(readEpisodes()[0].status,'draft');
 const published=await saveEpisode({...draft,description:'Descripción',status:'published'});
 assert.equal(readEpisodes().length,1);assert.equal(readEpisodes()[0].status,'published');
 assert.deepEqual((await loadEpisodes())[0].recipeIds,['REC-001']);
 await assert.rejects(saveEpisode({...blankEpisode(),title:'Duplicado',youtubeId:published.youtubeId}),/ya está registrado/);
 server.fail('Servicio no disponible');
 await assert.rejects(saveEpisode({...published,title:'Cambio no guardado'}),/Servicio/);
 assert.equal(readEpisodes()[0].title,'Episodio de prueba');
});
test('delete and undo affect only the chosen episode and failures keep the cache intact',async()=>{
 const server=catalogServer();await loadEpisodes();
 const first=await saveEpisode({...blankEpisode(),title:'Primero',youtubeId:'WD24I3yYQg4'});
 const second=await saveEpisode({...blankEpisode(),title:'Segundo',youtubeId:'abcdefghijk',status:'published'});
 const removed=await deleteEpisode(first.id);assert.equal(removed.id,first.id);
 assert.deepEqual(readEpisodes().map(item=>item.id),[second.id]);
 await assert.rejects(deleteEpisode('missing'),/No encontramos/);
 await saveEpisode(removed);assert.equal(readEpisodes().length,2);
 const before=structuredClone(readEpisodes());server.fail('Servicio no disponible');
 await assert.rejects(deleteEpisode(first.id),/Servicio/);assert.deepEqual(readEpisodes(),before);
 server.fail('');await deleteEpisode(first.id);await deleteEpisode(second.id);assert.deepEqual(readEpisodes(),[]);
});
