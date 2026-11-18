import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const {outputFiles}=await build({entryPoints:[root+'lib/knowledge-graph-filter.ts'],bundle:true,format:'esm',platform:'node',write:false});
const {filterKnowledgeGraph}=await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);

const node=(id,t,n)=>({id,t,n,to:'/'+id,r:14,x:100,y:100});
const nodes=[
  node('recipe-maize','rec','Maíz tostado'),
  node('recipe-sauce','rec','Salsa'),
  node('ingredient-maize','ing','Maíz azul'),
  node('ingredient-isolated','ing','Epazote'),
  node('cook','coc','Persona de prueba'),
  node('episode','ep','Capítulo de prueba'),
  node('instrument','leg','Instrumento de prueba'),
  node('market','mer','Mercado de prueba'),
  node('municipality','mun','Municipio de prueba'),
];
const legalEdge={source:'instrument',target:'ingredient-maize',type:'instrumento_relacionado',label:'Vínculo jurídico documentado',scope:'Alcance de prueba'};
const edges=[
  {source:'recipe-maize',target:'ingredient-maize',type:'utiliza'},
  {source:'recipe-sauce',target:'ingredient-maize',type:'utiliza'},
  {source:'recipe-maize',target:'recipe-sauce',type:'variante'},
  {source:'cook',target:'recipe-maize',type:'documenta'},
  {source:'episode',target:'recipe-maize',type:'documenta'},
  legalEdge,
  {source:'instrument',target:'market',type:'instrumento_relacionado'},
  {source:'instrument',target:'municipality',type:'instrumento_relacionado'},
  {source:'recipe-maize',target:'absent-record',type:'missing'},
];
const graph={nodes,edges};

test('one class keeps linked and isolated ingredients without bringing back recipes or legal neighbors',()=>{
  const visible=filterKnowledgeGraph(graph,['ing']);
  assert.deepEqual(visible.nodes.map(node=>node.id),['ingredient-maize','ingredient-isolated']);
  assert.deepEqual(visible.edges,[]);
});

test('classes combine as alternatives and an accent-insensitive search narrows both endpoints',()=>{
  const combined=filterKnowledgeGraph(graph,['ing','rec']);
  assert.deepEqual(combined.nodes.map(node=>node.id),['recipe-maize','recipe-sauce','ingredient-maize','ingredient-isolated']);
  assert.deepEqual(combined.edges.map(edge=>edge.type),['utiliza','utiliza','variante']);

  const searched=filterKnowledgeGraph(graph,['ing','rec'],'  MAIZ  ');
  assert.deepEqual(searched.nodes.map(node=>node.id),['recipe-maize','ingredient-maize']);
  assert.deepEqual(searched.edges,[edges[0]]);
  assert.deepEqual(filterKnowledgeGraph(graph,['coc'],'maíz'),{nodes:[],edges:[]});
});

test('all classes recover the complete public node set and preserve documented edge metadata without mutation',()=>{
  const before=structuredClone(graph);
  const filtered=filterKnowledgeGraph(graph,['leg','ing']);
  assert.equal(filtered.edges.length,1);
  assert.equal(filtered.edges[0],legalEdge);
  assert.equal(filtered.nodes.find(node=>node.id==='ingredient-maize'),nodes[2]);

  const empty=filterKnowledgeGraph(graph,['ing'],'sin coincidencias');
  assert.deepEqual(empty,{nodes:[],edges:[]});
  const reset=filterKnowledgeGraph(graph,[],'');
  assert.deepEqual(reset.nodes,nodes);
  assert.deepEqual(new Set(reset.nodes.map(node=>node.t)),new Set(['rec','ing','coc','ep','leg','mer','mun']));
  assert.deepEqual(reset.edges,edges.slice(0,-1));
  assert.deepEqual(graph,before);
});
