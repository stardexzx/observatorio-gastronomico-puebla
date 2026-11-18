type FilterableNode = {id:string;n:string;t:string};
type FilterableEdge = {source:string;target:string};

const normalize = (value:string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-MX").trim();

/** Filter the public graph without expanding matches to their neighbors or dropping isolated nodes. */
export function filterKnowledgeGraph<Node extends FilterableNode,Edge extends FilterableEdge>(
  graph:{nodes:readonly Node[];edges:readonly Edge[]},
  classes:readonly string[] = [],
  search = "",
):{nodes:Node[];edges:Edge[]} {
  const selectedClasses=new Set(classes);
  const query=normalize(search);
  const nodes=graph.nodes.filter(node=>(!selectedClasses.size||selectedClasses.has(node.t))&&normalize(node.n).includes(query));
  const visibleIds=new Set(nodes.map(node=>node.id));
  const edges=graph.edges.filter(edge=>visibleIds.has(edge.source)&&visibleIds.has(edge.target));
  return {nodes,edges};
}
