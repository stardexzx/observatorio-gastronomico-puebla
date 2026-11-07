"use client";
/* eslint-disable @next/next/no-img-element -- Previsualizaciones locales de archivos seleccionados. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChefHat, Cloud, FileCheck2, ImagePlus, MapPin, Plus, ScrollText, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSessionUser } from "@/components/auth/session-provider";
import { findCook, upsertCook } from "@/data/cook-storage";
import { cookRoles, cookSources, cookSpecialties, type CookMedia, type CookRecord } from "@/data/cooks";
import { loadRecipes } from "@/data/recipe-storage";
import type { RecipeRecord } from "@/data/recipes";
import { Chips, ChoiceChips, MunicipalityField } from "@/modules/recipes/recipe-form-controls";

type SectionId="general"|"territory"|"trajectory"|"recipes"|"memory"|"source"|"media";
const sections=[{id:"general",label:"General",description:"Identificación y semblanza del registro.",icon:ChefHat},{id:"territory",label:"Territorio",description:"Municipio, comunidad y lenguas.",icon:MapPin},{id:"trajectory",label:"Trayectoria y saberes",description:"Experiencia, especialidades y reconocimientos.",icon:ScrollText},{id:"recipes",label:"Recetas relacionadas",description:"Preparaciones que elabora o transmite.",icon:Utensils},{id:"memory",label:"Memoria y vínculos",description:"Frase, enseñanza, historia oral y vínculos comunitarios.",icon:ScrollText},{id:"source",label:"Fuente y consentimiento",description:"Procedencia de la información y autorización.",icon:FileCheck2},{id:"media",label:"Multimedia",description:"Retratos y fotografías del trabajo culinario.",icon:ImagePlus}] as const;
const stateOf=(item:CookRecord):Record<SectionId,boolean>=>({general:!!(item.name&&item.role&&item.biography.trim()),territory:!!(item.municipalityCode&&item.community.trim()),trajectory:!!(item.yearsExperience&&item.specialties.length),recipes:!!item.linkedRecipes.length,memory:!!(item.quote||item.studentCount||item.collective||item.establishments.length||item.linkedMarkets.length||item.culinaryLineage.length||item.oralHistories.length),source:!!(item.source&&item.sourceReference.trim()&&item.consent),media:!!item.photos.length});

export function CookEditor(){
  const params=useParams<{id:string}>();
  const router=useRouter();
  const user=useSessionUser();
  const canPublish=user?.role==="administrador"||user?.role==="revisor";
  const [item,setItem]=useState<CookRecord|null>(null);
  const savedFingerprint=useRef("");
  const [active,setActive]=useState<SectionId>("general");
  const [loaded,setLoaded]=useState(false);
  const [saving,setSaving]=useState(false);
  const [storageError,setStorageError]=useState("");
  const [loadError,setLoadError]=useState("");
  const [recipes,setRecipes]=useState<RecipeRecord[]>([]);
  const [recipesLoading,setRecipesLoading]=useState(true);
  const [recipesError,setRecipesError]=useState("");
  const [recipeAttempt,setRecipeAttempt]=useState(0);
  useEffect(()=>{
    let current=true;
    findCook(params.id).then(record=>{if(current){savedFingerprint.current=JSON.stringify(record);setItem(record);setLoadError("")}}).catch(error=>{if(current)setLoadError(error instanceof Error?error.message:"No se pudo cargar la ficha.")}).finally(()=>{if(current)setLoaded(true)});
    return()=>{current=false};
  },[params.id]);
  useEffect(()=>{
    let current=true;
    const timer=window.setTimeout(()=>{
      setRecipesLoading(true);
      setRecipesError("");
      loadRecipes().then(records=>{if(current)setRecipes(records)}).catch(error=>{
        if(current)setRecipesError(error instanceof Error?error.message:"No se pudieron cargar las recetas.");
      }).finally(()=>{if(current)setRecipesLoading(false)});
    },0);
    return()=>{current=false;window.clearTimeout(timer)};
  },[recipeAttempt]);
  const complete=useMemo(()=>item?stateOf(item):null,[item]);
  const completed=complete?Object.values(complete).filter(Boolean).length:0;
  const percentage=Math.round(completed/sections.length*100);
  const mandatory=!!(complete?.general&&complete.territory&&complete.trajectory&&complete.source);
  useEffect(()=>{
    if(!item||!loaded||JSON.stringify(item)===savedFingerprint.current)return;
    const start=window.setTimeout(()=>setSaving(true),0);
    const save=window.setTimeout(async()=>{
      try{
        await upsertCook({...item,completeness:percentage,updatedAt:new Intl.DateTimeFormat("es-MX",{day:"2-digit",month:"short",year:"numeric"}).format(new Date())});
        savedFingerprint.current=JSON.stringify(item);setStorageError("");
      }catch(error){setStorageError(error instanceof Error?error.message:"No se pudo guardar la ficha.")}
      finally{setSaving(false)}
    },500);
    return()=>{clearTimeout(start);clearTimeout(save)};
  },[item,percentage,loaded]);
  if(!loaded)return <div className="grid min-h-screen place-items-center bg-[#f5f7f6] text-sm text-[#8491a8]">Cargando ficha…</div>;
  if(!item)return <div className="grid min-h-screen place-items-center bg-[#f5f7f6]"><div className="max-w-lg p-6 text-center"><h1 className="editorial-title text-2xl font-bold">{loadError?"No se pudo abrir la ficha":"No encontramos este registro"}</h1>{loadError&&<p role="alert" className="mt-3 text-sm">{loadError}</p>}<Button className="mt-4" onClick={()=>router.push("/cocineras")}>Volver al directorio</Button></div></div>;
  const update=<K extends keyof CookRecord>(key:K,value:CookRecord[K])=>setItem(current=>current?{...current,[key]:value}:current);
  const index=sections.findIndex(section=>section.id===active);
  const current=sections[index];
  const CurrentIcon=current.icon;
  const submit=async()=>{
    if(!mandatory)return;
    const next={...item,status:"in-review" as const,completeness:percentage};
    try{await upsertCook(next);savedFingerprint.current=JSON.stringify(next);setItem(next);setStorageError("");toast.success("Registro enviado a revisión")}
    catch(error){const message=error instanceof Error?error.message:"No se pudo guardar la ficha.";setStorageError(message);toast.error(message)}
  };
  const publish=async()=>{
    if(!canPublish)return;
    const next={...item,status:item.status==="verified"?"draft" as const:"verified" as const,completeness:percentage};
    setSaving(true);
    try{const saved=await upsertCook(next);savedFingerprint.current=JSON.stringify(saved);setItem(saved);setStorageError("");toast.success(next.status==="verified"?"Ficha publicada":"Publicación retirada");}
    catch(error){const message=error instanceof Error?error.message:"No se pudo actualizar la publicación.";setStorageError(message);toast.error(message);}
    finally{setSaving(false)}
  };
  const addPhotos=async(files:FileList|null)=>{
    if(!files?.length)return;
    try{
      const photos=await Promise.all(Array.from(files,async file=>({id:`IMG-${crypto.randomUUID()}`,name:file.name,url:await persistentImage(file),type:file.type,size:file.size}) satisfies CookMedia));
      setItem(current=>current?{...current,photos:[...current.photos,...photos]}:current);
    }catch(error){toast.error(error instanceof Error?error.message:"No se pudieron cargar las fotografías.")}
  };
  return <main className="recipes-ui min-h-screen overflow-x-auto bg-[#f5f7f6] text-[#173257]"><header className="mx-auto flex min-h-[92px] w-[calc(100vw-24px)] min-w-[1208px] max-w-[1388px] items-center gap-4 py-4"><Button variant="outline" size="icon" onClick={()=>router.push("/cocineras")} className="size-11 rounded-full bg-white"><ArrowLeft/></Button><div><h1 className="editorial-title text-[31px] font-bold">{item.name}</h1><div className="flex items-center gap-3 text-xs text-[#8491a8]"><span className="font-medium text-[#173257]">• {item.status==="in-review"?"En revisión":item.status==="verified"?"Verificada/o":"Borrador"}</span><span>{item.municipality} · {item.region}</span><span className="flex items-center gap-1"><Cloud className="size-3.5"/>{storageError?"Sin guardar":saving?"Guardando…":"Guardado automático"}</span></div></div><div className="ml-auto flex gap-2"><Button disabled={!mandatory||saving} onClick={submit} className="h-11 rounded-full bg-[#cf1760] px-6 hover:bg-[#ac124f] disabled:bg-[#e2e7ef] disabled:text-[#9aa6ba]">Enviar a revisión</Button>{canPublish&&<Button variant="outline" disabled={saving||(!mandatory&&item.status!=="verified")} onClick={publish} className="h-11 rounded-full bg-white px-6">{item.status==="verified"?"Retirar publicación":"Publicar ficha"}</Button>}</div></header>{storageError&&<div role="alert" className="mx-auto mb-4 flex max-w-[1388px] items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{storageError}</p><Button variant="outline" onClick={()=>setItem(current=>current?{...current}:current)}>Reintentar guardado</Button></div>}<div className="mx-auto grid w-[calc(100vw-24px)] min-w-[1208px] max-w-[1388px] items-start gap-6 pb-10" style={{gridTemplateColumns:"260px minmax(600px,780px) 300px"}}><aside className="sticky top-5 rounded-[20px] border bg-white p-4"><div className="flex items-center gap-3 border-b px-2 pb-5"><div className="grid size-16 place-items-center rounded-full text-lg font-bold" style={{background:`conic-gradient(#007f78 ${percentage}%,#e7eced 0)`,padding:6}}><span className="grid size-full place-items-center rounded-full bg-white">{percentage}%</span></div><div><strong className="block">Ficha</strong><span className="text-sm text-[#8491a8]">{completed} de {sections.length} secciones</span></div></div><nav className="mt-4 space-y-1">{sections.map(({id,label,icon:Icon})=>{const done=complete?.[id];return <button key={id} onClick={()=>setActive(id)} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${active===id?"bg-[#eef2f4]":"hover:bg-[#f6f8f8]"}`}><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active===id?"bg-[#173257] text-white":done?"bg-[#dff2ed] text-[#007f78]":"bg-[#f1f4f5] text-[#66758d]"}`}>{done?<Check className="size-5"/>:<Icon className="size-5"/>}</span><span><strong className="block text-sm">{label}</strong><small className={done?"text-[#007f78]":id==="media"||id==="recipes"||id==="memory"?"text-[#98a3b7]":"text-[#d65c32]"}>{done?"Completa":id==="media"||id==="recipes"||id==="memory"?"Opcional":"Pendiente"}</small></span></button>})}</nav></aside><section className="min-h-[520px] rounded-[20px] border bg-white p-8"><div className="mb-7 flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-[#edf1f7] text-[#173257]"><CurrentIcon className="size-6"/></span><div><h2 className="editorial-title text-[24px] font-bold">{current.label}</h2><p className="text-sm text-[#66758d]">{current.description}</p></div></div>{active==="general"&&<General item={item} update={update}/>} {active==="territory"&&<Territory item={item} update={update}/>} {active==="trajectory"&&<Trajectory item={item} update={update}/>} {active==="recipes"&&<Field label="Recetas relacionadas">{recipesLoading?<p className="text-sm text-[#66758d]">Cargando recetas…</p>:recipesError?<div role="alert" className="space-y-3 text-sm text-red-800"><p>{recipesError}</p><Button variant="outline" onClick={()=>setRecipeAttempt(value=>value+1)}>Reintentar carga</Button></div>:recipes.length?<ChoiceChips options={Array.from(new Set([...recipes.map(recipe=>recipe.name),...item.linkedRecipes]))} value={item.linkedRecipes} onChange={value=>update("linkedRecipes",value)}/>:<p className="text-sm text-[#66758d]">No hay recetas registradas. Crea una receta para vincularla a esta ficha.</p>}{!!item.linkedRecipes.length&&(recipesLoading||recipesError||!recipes.length)&&<div className="mt-4"><p className="mb-2 text-xs text-[#66758d]">Vínculos guardados en esta ficha</p><Chips items={item.linkedRecipes} onRemove={name=>update("linkedRecipes",item.linkedRecipes.filter(value=>value!==name))}/></div>}</Field>} {active==="memory"&&<Memory item={item} update={update}/>} {active==="source"&&<Source item={item} update={update}/>} {active==="media"&&<Media item={item} update={update} addPhotos={addPhotos}/>}<div className="mt-8 flex justify-between border-t pt-5"><Button variant="ghost" disabled={index===0} onClick={()=>setActive(sections[index-1].id)}><ArrowLeft/>Anterior</Button>{index<sections.length-1&&<Button variant="outline" className="rounded-full" onClick={()=>setActive(sections[index+1].id)}>Siguiente: {sections[index+1].label}<ArrowRight/></Button>}</div></section><aside className="sticky top-5 rounded-[20px] bg-[#173257] p-5 text-white"><p className="text-xs text-[#b9c8dd]">Secciones obligatorias</p><h3 className="mt-1 text-lg font-bold">{mandatory?"Lista para enviar a revisión":`Faltan ${[complete?.general,complete?.territory,complete?.trajectory,complete?.source].filter(value=>!value).length} para enviar a revisión`}</h3><div className="mt-4 space-y-1.5">{(["general","territory","trajectory","source"] as SectionId[]).map(id=>{const section=sections.find(value=>value.id===id)!;const done=complete?.[id];return <button key={id} onClick={()=>setActive(id)} className="flex w-full items-center gap-3 rounded-xl bg-white/10 p-3 text-left"><span className={`grid size-6 place-items-center rounded-full ${done?"bg-[#55dfaa] text-[#0c5a42]":"bg-[#ffad82] text-[#7f2d13]"}`}>{done?<Check className="size-4"/>:<strong>!</strong>}</span><span><strong className="block text-sm">{section.label}</strong><small className="text-[#c8d4e5]">{done?"Completa":"Pendiente"}</small></span></button>})}</div><p className="mt-4 text-xs text-[#b9c8dd]">Recetas, memoria y multimedia son opcionales. El consentimiento es obligatorio.</p></aside></div></main>}

type Update=<K extends keyof CookRecord>(key:K,value:CookRecord[K])=>void;
function Field({label,children}:{label:string;children:React.ReactNode}){return <div><Label className="mb-2 block">{label}</Label>{children}</div>}
function General({item,update}:{item:CookRecord;update:Update}){return <div className="grid gap-5 sm:grid-cols-2"><Field label="Nombre"><Input value={item.name} onChange={e=>update("name",e.target.value)} className="h-12 rounded-xl border-0 bg-[#f1f4f5]"/></Field><Field label="Tipo de registro"><Select value={item.role||undefined} onValueChange={value=>update("role",value)}><SelectTrigger className="h-12 w-full rounded-xl border-0 bg-[#f1f4f5]"><SelectValue placeholder="Seleccionar"/></SelectTrigger><SelectContent>{cookRoles.map(value=><SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><div className="sm:col-span-2"><Field label="Semblanza"><Textarea rows={6} value={item.biography} onChange={e=>update("biography",e.target.value)} placeholder="Describe su trayectoria, vínculo comunitario y relevancia culinaria" className="rounded-xl border-0 bg-[#f1f4f5]"/></Field></div></div>}
function Territory({item,update}:{item:CookRecord;update:Update}){const [language,setLanguage]=useState("");return <div className="space-y-6"><Field label="Municipio"><MunicipalityField id="cook-editor-municipality" value={item.municipalityCode} onChange={(municipality,region)=>{update("municipality",municipality?.name??"");update("municipalityCode",municipality?.code??"");update("region",region)}}/><p className="mt-2 text-xs text-[#66758d]">Región <strong>{item.region||"Sin asignar"}</strong></p></Field><Field label="Comunidad o localidad"><Input value={item.community} onChange={e=>update("community",e.target.value)} className="h-12 rounded-xl border-0 bg-[#f1f4f5]"/></Field><ListField label="Lenguas" value={language} setValue={setLanguage} items={item.languages} onChange={value=>update("languages",value)} placeholder="Ej. Náhuatl"/></div>}
function Trajectory({item,update}:{item:CookRecord;update:Update}){return <div className="space-y-6"><Field label="Años de experiencia"><Input type="number" min="0" value={item.yearsExperience} onChange={e=>update("yearsExperience",e.target.value)} className="h-12 w-48 rounded-xl border-0 bg-[#f1f4f5]"/></Field><Field label="Saberes y especialidades"><ChoiceChips options={cookSpecialties} value={item.specialties} onChange={value=>update("specialties",value)}/></Field><Field label="Reconocimientos o participación comunitaria"><Textarea rows={4} value={item.recognitions} onChange={e=>update("recognitions",e.target.value)} className="rounded-xl border-0 bg-[#f1f4f5]"/></Field></div>}
function Source({item,update}:{item:CookRecord;update:Update}){
  const [reference,setReference]=useState("");
  return <div className="space-y-5"><Field label="Tipo de fuente"><ChoiceChips options={cookSources} value={item.source?[item.source]:[]} onChange={values=>update("source",values.at(-1)??"")}/></Field><Field label="Referencia"><Textarea rows={4} value={item.sourceReference} onChange={e=>update("sourceReference",e.target.value)} placeholder="Describe la entrevista, documento o actividad de campo" className="rounded-xl border-0 bg-[#f1f4f5]"/></Field><Field label="Fecha de consulta"><Input type="date" value={item.consultationDate} onChange={e=>update("consultationDate",e.target.value)} className="h-12 w-60 rounded-xl border-0 bg-[#f1f4f5]"/></Field>
    <ListField label="Fuentes y referencias adicionales" value={reference} setValue={setReference} items={item.sourceReferences} onChange={value=>update("sourceReferences",value)} placeholder="Documento, entrevista, URL o referencia"/>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Fecha de verificación"><Input type="date" value={item.verifiedAt} onChange={e=>update("verifiedAt",e.target.value)} className="h-12 rounded-xl border-0 bg-[#f1f4f5]"/></Field><Field label="Persona o institución que verificó"><Input value={item.verifiedBy} onChange={e=>update("verifiedBy",e.target.value)} className="h-12 rounded-xl border-0 bg-[#f1f4f5]"/></Field></div>
    <p className="text-xs text-[#66758d]">Anota la verificación y sus fuentes cuando exista respaldo documental.</p>
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${item.consent?"border-[#9fd5c9] bg-[#e8f5f1]":"bg-[#f8faf9]"}`}><input type="checkbox" checked={item.consent} onChange={e=>update("consent",e.target.checked)} className="mt-1 size-4 accent-[#007f78]"/><span><strong className="block text-sm">Consentimiento para publicación</strong><small className="text-[#66758d]">La persona autorizó el uso de su información e imagen dentro del observatorio.</small></span></label></div>
}
function Memory({item,update}:{item:CookRecord;update:Update}){
  const [establishment,setEstablishment]=useState("");
  const [market,setMarket]=useState("");
  const [lineage,setLineage]=useState("");
  const changeHistory=(id:string,fields:Partial<CookRecord["oralHistories"][number]>)=>update("oralHistories",item.oralHistories.map(history=>history.id===id?{...history,...fields}:history));
  const addRecording=async(id:string,file:File|undefined)=>{
    if(!file)return;
    try{
      if(!["audio/mpeg","audio/mp4","audio/wav","audio/x-wav","audio/ogg","audio/webm"].includes(file.type)||file.size>10*1024*1024)throw new Error("Elige un audio MP3, M4A, WAV, OGG o WEBM de hasta 10 MB.");
      const url=await persistentFile(file);
      changeHistory(id,{url});
    }catch(error){toast.error(error instanceof Error?error.message:"No se pudo leer la grabación.")}
  };
  return <div className="space-y-6">
    <Field label="Frase o testimonio destacado"><Textarea value={item.quote} onChange={e=>update("quote",e.target.value)} rows={3} placeholder="Palabras de la persona sobre su cocina y comunidad" className="rounded-xl border-0 bg-[#f1f4f5]"/></Field>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Personas a quienes ha enseñado"><Input type="number" min="0" step="1" value={item.studentCount} onChange={e=>update("studentCount",Math.max(0,Math.floor(Number(e.target.value)||0)))} className="h-12 rounded-xl border-0 bg-[#f1f4f5]"/></Field><Field label="Colectivo o agrupación"><Input value={item.collective} onChange={e=>update("collective",e.target.value)} className="h-12 rounded-xl border-0 bg-[#f1f4f5]"/></Field></div>
    <ListField label="Establecimientos vinculados" value={establishment} setValue={setEstablishment} items={item.establishments} onChange={value=>update("establishments",value)} placeholder="Nombre del establecimiento y localidad"/>
    <ListField label="Mercados vinculados" value={market} setValue={setMarket} items={item.linkedMarkets} onChange={value=>update("linkedMarkets",value)} placeholder="Nombre del mercado"/>
    <ListField label="Linaje culinario" value={lineage} setValue={setLineage} items={item.culinaryLineage} onChange={value=>update("culinaryLineage",value)} placeholder="Persona, parentesco o saber transmitido"/>
    <div className="space-y-4"><div className="flex items-center justify-between gap-3"><Label>Registros de historia oral</Label><Button variant="outline" onClick={()=>update("oralHistories",[...item.oralHistories,{id:`ORAL-${crypto.randomUUID()}`,title:"",date:"",duration:"",url:""}])}><Plus className="size-4"/>Agregar registro</Button></div>
      {!item.oralHistories.length&&<p className="text-sm text-[#66758d]">Agrega entrevistas o memorias con una grabación local o un enlace.</p>}
      {item.oralHistories.map((history,index)=><fieldset key={history.id} className="space-y-4 rounded-xl border p-4"><legend className="px-1 text-sm font-medium">Registro {index+1}</legend><Field label="Título de la historia"><Input aria-label={`Título de la historia ${index+1}`} value={history.title} onChange={e=>changeHistory(history.id,{title:e.target.value})}/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha"><Input aria-label={`Fecha de la historia ${index+1}`} type="date" value={history.date} onChange={e=>changeHistory(history.id,{date:e.target.value})}/></Field><Field label="Duración"><Input aria-label={`Duración de la historia ${index+1}`} value={history.duration} placeholder="Ej. 18:45" onChange={e=>changeHistory(history.id,{duration:e.target.value})}/></Field></div><Field label="Enlace a la grabación"><Input aria-label={`Enlace de la historia ${index+1}`} value={history.url.startsWith("data:")?"":history.url} placeholder={history.url.startsWith("data:")?"Grabación local adjunta; pega un enlace para reemplazarla":"https://…"} onChange={e=>changeHistory(history.id,{url:e.target.value})}/></Field><label className="block text-sm font-medium">Adjuntar grabación local<input type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,audio/webm" className="mt-2 block w-full text-xs" onChange={e=>{void addRecording(history.id,e.target.files?.[0]);e.target.value=""}}/></label>{/^(https?:\/\/|data:audio\/)/i.test(history.url)&&<audio controls src={history.url} className="w-full"/>}<Button variant="ghost" className="text-red-700" onClick={()=>update("oralHistories",item.oralHistories.filter(value=>value.id!==history.id))}><Trash2 className="size-4"/>Eliminar historia</Button></fieldset>)}
    </div>
  </div>
}

function ListField({label,value,setValue,items,onChange,placeholder}:{label:string;value:string;setValue:(value:string)=>void;items:string[];onChange:(value:string[])=>void;placeholder:string}){const add=()=>{const next=value.trim();if(next&&!items.includes(next))onChange([...items,next]);setValue("")};return <Field label={label}><div className="flex gap-2"><Input value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add()}}} placeholder={placeholder} className="h-11 rounded-xl bg-[#f1f4f5]"/><Button type="button" onClick={add}><Plus/></Button></div><div className="mt-3"><Chips items={items} onRemove={item=>onChange(items.filter(value=>value!==item))}/></div></Field>}
function Media({item,update,addPhotos}:{item:CookRecord;update:Update;addPhotos:(files:FileList|null)=>void}){return <div><label className="grid min-h-44 cursor-pointer place-items-center rounded-[18px] border-2 border-dashed bg-[#f8faf9] text-center"><span><ImagePlus className="mx-auto mb-3 size-8 text-[#173257]"/><strong>Arrastra fotografías o elige archivos</strong><small className="mt-1 block text-[#98a3b7]">JPG, PNG o WEBP hasta 10 MB</small></span><input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>addPhotos(e.target.files)}/></label><div className="mt-4 grid grid-cols-3 gap-3">{item.photos.map(photo=><div key={photo.id} className="relative overflow-hidden rounded-xl bg-[#f1f4f5]"><img src={photo.url} alt="" className="aspect-square w-full object-cover"/><Button size="icon" variant="secondary" className="absolute right-2 top-2 size-8" onClick={()=>update("photos",item.photos.filter(value=>value.id!==photo.id))}><Trash2 className="size-4"/></Button></div>)}</div></div>}

function persistentFile(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error(`No se pudo leer el archivo ${file.name}.`));
    reader.onabort=()=>reject(new Error("Se canceló la lectura del archivo."));
    reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(new Error("El archivo no se pudo convertir para guardarlo."));
    reader.readAsDataURL(file);
  });
}
async function persistentImage(file:File){
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>10*1024*1024)throw new Error(`La fotografía ${file.name} debe ser JPG, PNG o WEBP de hasta 10 MB.`);
  return persistentFile(file);
}
