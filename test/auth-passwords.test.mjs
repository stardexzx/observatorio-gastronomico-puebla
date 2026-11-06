import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/auth/passwords.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
const {hashPassword,verifyPassword,validPassword,newToken,tokenHash}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('salted password hashes verify correctly and reject wrong or malformed inputs',async()=>{
 const password='Frase de prueba 2026!';const a=await hashPassword(password);const b=await hashPassword(password);
 assert.notEqual(a,b);assert.ok(!a.includes(password));assert.equal(await verifyPassword(password,a),true);
 assert.equal(await verifyPassword('Clave incorrecta',a),false);assert.equal(await verifyPassword(password,'invalid hash'),false);
 assert.equal(validPassword('short'),false);assert.equal(validPassword('x'.repeat(129)),false);assert.equal(validPassword(password),true);
});
test('session tokens have sufficient random bytes and are stored as digests',()=>{
 const a=newToken(),b=newToken();assert.match(a,/^[A-Za-z0-9_-]{43}$/);assert.notEqual(a,b);assert.match(tokenHash(a),/^[a-f0-9]{64}$/);assert.notEqual(tokenHash(a),a);
});
