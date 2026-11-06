import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/request-origin.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
const {isSameOriginJson}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const request=(host,origin,content='application/json')=>({url:'http://localhost:5173/api/auth/login',headers:new Headers({host,origin,'content-type':content})});
test('accepts the browser origin when Next normalizes its internal URL hostname',()=>{
 assert.equal(isSameOriginJson(request('127.0.0.1:5173','http://127.0.0.1:5173')),true);
 assert.equal(isSameOriginJson(request('localhost:5173','http://localhost:5173')),true);
 assert.equal(isSameOriginJson(request('[::1]:5173','http://[::1]:5173')),true);
});
test('rejects cross-origin, mismatched ports, missing identity and invalid host headers',()=>{
 for(const [host,origin,content] of [['127.0.0.1:5173','https://example.org'],['127.0.0.1:5173','http://127.0.0.1:5174'],['localhost:5173','null'],['bad@localhost:5173','http://localhost:5173'],['localhost:5173','http://localhost:5173','text/plain']]) assert.equal(isSameOriginJson(request(host,origin,content)),false);
 assert.equal(isSameOriginJson({url:'http://localhost:5173/api',headers:new Headers({'content-type':'application/json'})}),false);
});
