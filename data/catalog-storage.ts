/** Shared transport for authenticated capture; browser archives are never imported implicitly. */
let mutationTail:Promise<unknown>=Promise.resolve();
export async function catalogRequest<T>(kind:string,id?:string,method="GET",record?:unknown):Promise<T>{
  const request=async()=>{
    const response=await fetch(`/api/catalogs/${kind}${id?`/${encodeURIComponent(id)}`:""}`,{
      method,cache:"no-store",...(method!=="GET"?{headers:{"Content-Type":"application/json"}}:{}),
      ...(record!==undefined?{body:JSON.stringify(record)}:{}),
    });
    const body=await response.json() as {error?:string};
    if(!response.ok)throw new Error(body.error||"No se pudo completar la operación. Vuelve a intentarlo.");
    return body as T;
  };
  if(method==="GET")return request();
  // Debounced edits and explicit publication must reach PostgreSQL in the order requested.
  const pending=mutationTail.then(request,request);
  mutationTail=pending.catch(()=>undefined);
  return pending;
}
