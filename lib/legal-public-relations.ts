import {legalLinkKey,type LegalLink,type LegalLinkKind,type LegalRecord} from '@/data/legal';

export type PublicLegalIdentity = {id:string;publicOrigin?:LegalLink['origin']};
export type LinkedPublicLegalRecord = {record:LegalRecord;links:LegalLink[]};

/** Reverse relations use the public catalog identity and the instrument's existing links. */
export function linkedPublicLegalRecords(records:LegalRecord[],kind:LegalLinkKind,entry:PublicLegalIdentity):LinkedPublicLegalRecord[] {
  if(!entry.publicOrigin)return [];
  const key=legalLinkKey({kind,origin:entry.publicOrigin,id:entry.id});
  const seen=new Set<string>();
  return records.flatMap(record=>{
    if(!record.published||record.status!=='publicado'||seen.has(record.id))return [];
    const links=record.links.filter(link=>legalLinkKey(link)===key);
    if(!links.length)return [];
    seen.add(record.id);
    return [{record,links}];
  });
}

export type PublicKnowledgeNode = {id:string;n:string;t:string;to:string;r:number;x:number;y:number};
export type PublicKnowledgeEdge = {source:string;target:string;type:string;label?:string;scope?:string};
type LegalGraphCatalog = {
  legal:LegalRecord[];
  recipes:PublicLegalIdentity[];
  ingredients:PublicLegalIdentity[];
  cooks:PublicLegalIdentity[];
  markets:(PublicLegalIdentity & {name:string})[];
};
const publicRoute=(value:string|undefined)=>Boolean(value&&value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!/[\u0000-\u0020]/.test(value));

/** Add only links already authorized by the public legal service; never infer legal relations from names. */
export function addPublicLegalGraph(graph:{nodes:PublicKnowledgeNode[];edges:PublicKnowledgeEdge[];partial:boolean},catalog:LegalGraphCatalog) {
  const nodes=[...graph.nodes],edges=[...graph.edges];
  const valid=new Set(nodes.map(node=>node.id));
  const targets=new Map<string,string>();
  const kinds={recipes:'recetas',ingredients:'ingredientes',cooks:'cocineras'} as const;
  for(const kind of Object.keys(kinds) as (keyof typeof kinds)[])for(const entry of catalog[kind]){
    const graphId=kinds[kind]+':'+entry.id;
    if(entry.publicOrigin&&valid.has(graphId))targets.set(legalLinkKey({kind,origin:entry.publicOrigin,id:entry.id}),graphId);
  }
  const seen=new Set(edges.map(edge=>[edge.source,edge.target,edge.type].join('|')));
  for(const record of catalog.legal){
    if(!record.published||record.status!=='publicado')continue;
    const source='proteccion-legal:'+record.id;
    if(!valid.has(source)){
      valid.add(source);
      nodes.push({id:source,n:record.name,t:'leg',to:'/proteccion-legal/'+encodeURIComponent(record.id),r:16,x:0,y:0});
    }
    for(const link of record.links){
      const key=legalLinkKey(link);
      let target=targets.get(key);
      if(link.kind==='markets'){
        const market=catalog.markets.find(entry=>entry.id===link.id&&entry.publicOrigin===link.origin);
        if(!market||!publicRoute(link.href))continue;
        target='mercados:'+market.id;
        if(!valid.has(target)){
          valid.add(target);
          nodes.push({id:target,n:market.name,t:'mer',to:link.href!,r:14,x:0,y:0});
        }
      }
      if(link.kind==='municipalities'){
        if(link.origin!=='ogp'||!link.name||!publicRoute(link.href))continue;
        target='municipios:'+link.id;
        if(!valid.has(target)){
          valid.add(target);
          nodes.push({id:target,n:link.name,t:'mun',to:link.href!,r:14,x:0,y:0});
        }
      }
      if(!target||!valid.has(target)||target===source)continue;
      const edgeKey=[source,target,'instrumento_relacionado'].join('|');
      if(seen.has(edgeKey))continue;
      seen.add(edgeKey);
      edges.push({source,target,type:'instrumento_relacionado',label:'Vínculo jurídico documentado',scope:link.scope});
    }
  }
  return {nodes,edges,partial:graph.partial};
}
