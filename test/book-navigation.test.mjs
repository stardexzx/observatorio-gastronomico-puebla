import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/book-navigation.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
const {bookSpread,bookPages,turnBook,parseByteRange}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('cover, spreads, odd final pages and backwards navigation keep every PDF page reachable',()=>{
 for(const total of [1,2,3,96,97]){
  let page=1;const seen=[];
  for(let step=0;step<=total;step++){
   seen.push(...bookPages(page,total,true));const next=turnBook(page,total,true,1);if(next===page)break;assert.equal(turnBook(next,total,true,-1),page);page=next;
  }
  assert.deepEqual(seen,Array.from({length:total},(_,index)=>index+1));
 }
 assert.deepEqual(bookPages(3,97,true),[2,3]);assert.equal(bookSpread(99,97,true),96);
 assert.equal(turnBook(97,97,false,1),97);assert.equal(turnBook(1,97,false,-1),1);
 assert.deepEqual(bookPages(3,97,false),[3]);assert.deepEqual(bookPages(1,0,true),[]);
});
test('PDF range requests allow ordinary, suffix and open ranges and reject unsafe boundaries',()=>{
 assert.deepEqual(parseByteRange('bytes=0-1023',10000),{start:0,end:1023});
 assert.deepEqual(parseByteRange('bytes=9000-',10000),{start:9000,end:9999});
 assert.deepEqual(parseByteRange('bytes=-500',10000),{start:9500,end:9999});
 assert.deepEqual(parseByteRange('bytes=9000-20000',10000),{start:9000,end:9999});
 for(const value of ['bytes=10000-','bytes=3-1','bytes=-0','bytes=-','bytes=1-2,4-5','bytes=Infinity-','nonsense'])assert.equal(parseByteRange(value,10000),null);
});
