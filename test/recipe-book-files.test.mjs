import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ts from 'typescript';
const source=await readFile(new URL('../lib/recipe-book-files.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
const {inspectRecipeBookFiles}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const book=filename=>({id:filename,title:'Referencia de prueba',subtitle:'Prueba',filename});
test('only actual nonempty PDF files enable a catalog reader; missing references stay visible',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'ogp-books-'));
 try{
  await writeFile(join(directory,'present.pdf'),'%PDF-1.4\n%%EOF');
  await writeFile(join(directory,'empty.pdf'),'');
  await mkdir(join(directory,'folder.pdf'));
  const input=['missing.pdf','present.pdf','empty.pdf','folder.pdf','../outside.pdf'].map(book);
  const result=await inspectRecipeBookFiles(input,directory);
  assert.equal(result.length,input.length);
  assert.deepEqual(result.map(r=>r.available),[false,true,false,false,false]);
  assert.equal(result[0].title,'Referencia de prueba');
  assert.ok(!('available' in input[0]),'does not mutate the authoritative metadata');
 }finally{await rm(directory,{recursive:true,force:true});}
});
