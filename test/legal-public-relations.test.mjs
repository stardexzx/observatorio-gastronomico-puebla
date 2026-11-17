import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const {outputFiles} = await build({entryPoints:[`${root}lib/legal-public-relations.ts`],bundle:true,format:'esm',platform:'node',write:false});
const {linkedPublicLegalRecords,addPublicLegalGraph} = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);

// Isolated, nonpersistent fixtures contain only the fields consumed by these pure helpers.
const sharedId='00000000-0000-4000-8000-000000000001';
const link=(overrides={})=>({kind:'cooks',origin:'ogp',id:sharedId,name:'Persona de prueba',scope:'Alcance de prueba',sourceId:'source-fixture',...overrides});
const record=(overrides={})=>({id:'instrument-fixture',name:'Instrumento de prueba',status:'borrador',published:false,links:[],...overrides});
const published=(overrides={})=>record({status:'publicado',published:true,...overrides});
const node=(prefix,id=sharedId)=>({id:prefix+':'+id,n:'Nombre de prueba',t:prefix==='cocineras'?'coc':'ing',to:'/'+prefix+'/'+id,r:14,x:0,y:0});
const graph=(nodes=[])=>({nodes,edges:[],partial:false});
const catalog=(overrides={})=>({recipes:[],ingredients:[],cooks:[],markets:[],legal:[],...overrides});

test('the same UUID in another origin cannot create a reverse relation or graph edge',()=>{
  const entry={id:sharedId,name:'Nombre compartido',publicOrigin:'ogp'};
  const instrument=published({links:[link({kind:'ingredients',origin:'panel',name:entry.name})]});
  assert.deepEqual(linkedPublicLegalRecords([instrument],'ingredients',entry),[]);
  const result=addPublicLegalGraph(graph([node('ingredientes')]),catalog({ingredients:[entry],legal:[instrument]}));
  assert.equal(result.edges.length,0);

  const matching=published({links:[link({kind:'ingredients',origin:'ogp',name:'Un nombre diferente'})]});
  assert.equal(linkedPublicLegalRecords([matching],'ingredients',entry)[0].record.id,matching.id);
  assert.equal(addPublicLegalGraph(graph([node('ingredientes')]),catalog({ingredients:[entry],legal:[matching]})).edges.length,1);
});

test('cook and producer links share one public person node and one documented legal edge',()=>{
  const person={id:sharedId,publicOrigin:'ogp'};
  const instrument=published({links:[link(),link({kind:'producers'})]});
  const linked=linkedPublicLegalRecords([instrument,instrument],'cooks',person);
  assert.equal(linked.length,1);
  assert.equal(linked[0].links.length,2);
  const result=addPublicLegalGraph(graph([node('cocineras')]),catalog({cooks:[person],legal:[instrument,instrument]}));
  assert.equal(result.nodes.filter(item=>item.id==='cocineras:'+sharedId).length,1);
  assert.equal(result.nodes.filter(item=>item.t==='leg').length,1);
  assert.equal(result.edges.length,1);
  assert.deepEqual(result.edges[0],{source:'proteccion-legal:'+instrument.id,target:'cocineras:'+sharedId,type:'instrumento_relacionado',label:'Vínculo jurídico documentado',scope:'Alcance de prueba'});
});

test('drafts and records without a publication never appear as legal nodes or reverse relations',()=>{
  const person={id:sharedId,publicOrigin:'ogp'};
  const records=[
    record({id:'draft-fixture',links:[link()]}),
    record({id:'inconsistent-draft-fixture',published:true,links:[link()]}),
    record({id:'withdrawn-fixture',status:'publicado',links:[link()]}),
    published({id:'published-fixture',links:[link()]}),
  ];
  assert.deepEqual(linkedPublicLegalRecords(records,'cooks',person).map(item=>item.record.id),['published-fixture']);
  const result=addPublicLegalGraph(graph([node('cocineras')]),catalog({cooks:[person],legal:records}));
  assert.deepEqual(result.nodes.filter(item=>item.t==='leg').map(item=>item.id),['proteccion-legal:published-fixture']);
  assert.equal(result.edges.length,1);
});

test('missing public markets and municipalities with unsafe destinations add no nodes or edges',()=>{
  const publicMarket={id:'public-market-fixture',name:'Nombre compartido',publicOrigin:'ogp'};
  const instrument=published({links:[
    link({kind:'markets',id:'private-market-fixture',name:publicMarket.name,href:'/mercados/private-market-fixture'}),
    link({kind:'markets',id:publicMarket.id,origin:'panel',name:publicMarket.name,href:'/mercados/'+publicMarket.id}),
    ...['javascript:alert(1)','https://example.com/municipio','//example.com/municipio','/\\\\example.com/municipio','/mapa?municipio=21 114'].map((href,index)=>link({kind:'municipalities',id:'unsafe-municipality-'+index,name:'Municipio de prueba',href})),
  ]});
  const result=addPublicLegalGraph(graph(),catalog({markets:[publicMarket],legal:[instrument]}));
  assert.equal(result.edges.length,0);
  assert.equal(result.nodes.filter(item=>item.t==='mer'||item.t==='mun').length,0);
});

test('only linked public markets and safe municipalities are added, once per identity',()=>{
  const market={id:'public-market-fixture',name:'Mercado de prueba',publicOrigin:'ogp'};
  const unused={id:'unlinked-market-fixture',name:'Mercado sin vínculo',publicOrigin:'ogp'};
  const marketLink=link({kind:'markets',id:market.id,name:market.name,href:'/mercados/'+market.id});
  const municipality=link({kind:'municipalities',id:'municipality-fixture',name:'Municipio de prueba',municipalityCode:'21114',href:'/mapa?municipio=21114'});
  const instrument=published({links:[marketLink,marketLink,municipality,municipality]});
  const result=addPublicLegalGraph(graph(),catalog({markets:[market,unused],legal:[instrument]}));
  assert.equal(result.edges.length,2);
  assert.deepEqual(result.nodes.filter(item=>item.t==='mer'||item.t==='mun').map(({id,n,to})=>({id,n,to})),[
    {id:'mercados:'+market.id,n:market.name,to:marketLink.href},
    {id:'municipios:'+municipality.id,n:municipality.name,to:municipality.href},
  ]);
});

test('missing origin cannot be replaced by matching IDs or names',()=>{
  const person={id:sharedId,name:'Persona de prueba'};
  const instrument=published({links:[link({name:person.name})]});
  assert.deepEqual(linkedPublicLegalRecords([instrument],'cooks',person),[]);
  const result=addPublicLegalGraph(graph([node('cocineras')]),catalog({cooks:[person],legal:[instrument]}));
  assert.equal(result.edges.length,0);
  assert.equal(result.nodes.filter(item=>item.t==='coc').length,1);
});
