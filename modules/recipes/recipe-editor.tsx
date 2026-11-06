"use client";
/* eslint-disable @next/next/no-img-element -- Previsualizaciones de archivos locales. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChefHat, FileAudio, Globe2, ImagePlus, Info, ListOrdered, MapPin, Mic2, NotebookTabs, Plus, Save, ScrollText, Send, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { ObservatorySidebar } from "@/components/dashboard/observatory-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { findRecipe, readRecipes, upsertRecipe } from "@/data/recipe-storage";
import { ingredientCatalog, informantRoles, recipeCategories, recipeMonths, recipeOccasions, recipeSources, recipeSourceComplete, recipeStatusLabels, recipeVigencies, traditionalTechniques, type RecipeMedia, type RecipeRecord } from "@/data/recipes";
import { MunicipalityField, SearchSelect, normalizeText } from "./recipe-form-controls";

type SectionId="general"|"ingredients"|"preparation"|"temporality"|"source"|"media";
const sections:{id:SectionId;label:string;description:string;icon:typeof Info}[]=[
  {id:"general",label:"Datos generales",description:"Identifica la preparación, su origen y su importancia cultural.",icon:Info},
  {id:"ingredients",label:"Ingredientes",description:"Selecciona los ingredientes y las técnicas tradicionales.",icon:ChefHat},
  {id:"preparation",label:"Preparación",description:"Cuenta cómo se prepara la receta, paso a paso.",icon:ListOrdered},
  {id:"temporality",label:"Temporalidad",description:"¿En qué temporada y ocasiones se prepara?",icon:CalendarDays},
  {id:"source",label:"Fuentes",description:"Documenta de dónde proviene la información.",icon:Mic2},
  {id:"media",label:"Multimedia",description:"Acompaña la ficha con fotografías y grabaciones.",icon:ImagePlus},
];
function sectionState(recipe:RecipeRecord):Record<SectionId,boolean>{return {
  general:!!(recipe.name.trim()&&recipe.municipalityCode&&recipe.category&&recipe.description.trim()&&recipe.vigency),
  ingredients:!!(recipe.ingredients.length&&recipe.techniques.length),preparation:recipe.steps.some(step=>step.trim()),
  temporality:!!(recipe.months.length||recipe.occasions.length),source:recipeSourceComplete(recipe),media:recipe.photos.length>0||recipe.audio.length>0,
};}

export function RecipeEditor(){
  const params=useParams<{id:string}>();const router=useRouter();
  const [recipe,setRecipe]=useState<RecipeRecord|null>(null);const [active,setActive]=useState<SectionId>("general");
  const [loaded,setLoaded]=useState(false);const [saving,setSaving]=useState(false);const [loadError,setLoadError]=useState("");const [saveError,setSaveError]=useState("");const [lastSaved,setLastSaved]=useState("");
  const [ingredientOptions,setIngredientOptions]=useState(ingredientCatalog);const [creatingIngredient,setCreatingIngredient]=useState(false);const [ingredientName,setIngredientName]=useState("");const [readingFiles,setReadingFiles]=useState(false);const [selectedIngredient,setSelectedIngredient]=useState("");
  useEffect(()=>{let cancelled=false;findRecipe(params.id).then(item=>{if(!cancelled){setRecipe(item);setLastSaved(item?JSON.stringify(item):"");}}).catch(error=>{if(!cancelled)setLoadError(error.message);}).finally(()=>{if(!cancelled)setLoaded(true);});return()=>{cancelled=true;};},[params.id]);
  const complete=useMemo(()=>recipe?sectionState(recipe):null,[recipe]);const completed=complete?Object.values(complete).filter(Boolean).length:0;const percentage=Math.round(completed/6*100);
  const mandatoryComplete=!!(complete?.general&&complete.ingredients&&complete.preparation&&complete.source);
  const unsaved=!!recipe&&JSON.stringify(recipe)!==lastSaved;
  useEffect(()=>{if(!loaded||!recipe||JSON.stringify(recipe)===lastSaved)return;let current=true;const timer=window.setTimeout(async()=>{setSaving(true);try{await upsertRecipe({...recipe,completeness:percentage});if(current){setLastSaved(JSON.stringify(recipe));setSaveError("");}}catch(error){if(current)setSaveError(error instanceof Error?error.message:"No se pudo guardar.");}finally{if(current)setSaving(false);}},600);return()=>{current=false;window.clearTimeout(timer);};},[recipe,percentage,loaded,lastSaved]);
  useEffect(()=>{if(!unsaved)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[unsaved]);
  const update=<K extends keyof RecipeRecord>(key:K,value:RecipeRecord[K])=>setRecipe(current=>current?{...current,[key]:value}:current);
  const returnToList=()=>{if(unsaved){toast.info("Espera un momento mientras se guardan tus cambios.");return;}router.push("/recetas");};
  const save=async(review=false)=>{if(!recipe)return;setSaving(true);const next={...recipe,completeness:percentage,status:review?"in-review" as const:recipe.status};try{await upsertRecipe(next);setRecipe(next);setLastSaved(JSON.stringify(next));setSaveError("");toast.success(review?"Receta en revisión":"Ficha guardada");}catch(error){setSaveError(error instanceof Error?error.message:"No se pudo guardar.");}finally{setSaving(false);}};
  const createIngredient=()=>{const name=ingredientName.trim();if(!name||!recipe)return;const existing=ingredientOptions.find(item=>normalizeText(item)===normalizeText(name));const finalName=existing??name;if(!existing)setIngredientOptions(items=>[...items,name]);if(!recipe.ingredients.includes(finalName))update("ingredients",[...recipe.ingredients,finalName]);setIngredientName("");setCreatingIngredient(false);};
  const addFiles=async(files:FileList|File[]|null)=>{if(!files)return;setReadingFiles(true);const photos:RecipeMedia[]=[];const audio:RecipeMedia[]=[];
    for(const file of Array.from(files)){const isPhoto=["image/jpeg","image/png","image/webp"].includes(file.type);const isAudio=["audio/mpeg","audio/mp4","audio/x-m4a","audio/wav","audio/x-wav"].includes(file.type);if((!isPhoto&&!isAudio)||file.size>(isPhoto?8:20)*1024*1024){toast.error(`${file.name}: formato no admitido o tamaño excesivo.`);continue;}
      try{const url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as string);reader.onerror=()=>reject(new Error("No se pudo leer el archivo."));reader.readAsDataURL(file);});const item={id:crypto.randomUUID(),name:file.name,url,caption:"",type:file.type,size:file.size};(isPhoto?photos:audio).push(item);}catch{toast.error(`No se pudo leer ${file.name}.`);}}
    setRecipe(current=>current?{...current,photos:[...current.photos,...photos],audio:[...current.audio,...audio]}:current);setReadingFiles(false);
  };
  const selectSection=(id:SectionId)=>{setActive(id);window.requestAnimationFrame(()=>document.getElementById("recipe-form-panel")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"}));};
  const currentIndex=sections.findIndex(item=>item.id===active);const current=sections[currentIndex];
  return <div className="acervo-page min-h-screen text-[#173257]"><ObservatorySidebar activeItem="Recetas"/><main className="admin-main"><div className="mx-auto max-w-[1360px]">
    {!loaded?<p className="p-12 text-center text-sm text-[#8190a4]" role="status">Cargando ficha…</p>:loadError||!recipe?<div className="acervo-card p-8"><h1 className="text-xl font-semibold">{loadError||"No encontramos esta receta"}</h1><button onClick={()=>router.push("/recetas")} className="acervo-primary mt-5"><ArrowLeft className="size-4"/>Volver a Recetas</button></div>:<>
      <header className="acervo-heading"><div className="flex min-w-0 items-start gap-3"><button onClick={returnToList} aria-label="Volver a Recetas" className="acervo-secondary mt-0.5 size-9 shrink-0 p-0"><ArrowLeft className="size-4"/></button><div className="min-w-0"><p className="mb-1 text-[10px] text-[#8a97a9]">Acervo / Recetas / Ficha</p><h1 className="break-words">{recipe.name||"Receta sin nombre"}</h1><p className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className={`recipe-status status-${recipe.status}`}>{recipeStatusLabels[recipe.status]}</span><span>{recipe.municipality}</span><span className="inline-flex items-center gap-1" role="status"><Check className="size-3"/>{saveError?"Cambios sin guardar":saving||unsaved?"Guardando…":"Guardado"}</span></p></div></div><div className="flex flex-wrap items-center gap-2"><button disabled={saving||readingFiles} onClick={()=>save()} className="acervo-secondary"><Save className="size-3.5"/>Guardar</button><button disabled={!mandatoryComplete||saving||unsaved||readingFiles||recipe.status==="in-review"} onClick={()=>save(true)} title={!mandatoryComplete?"Completa datos generales, ingredientes, preparación y fuentes.":"Enviar a revisión"} className="acervo-primary"><Send className="size-3.5"/>{recipe.status==="in-review"?"En revisión":"Enviar a revisión"}</button></div></header>
      {saveError&&<div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-xs text-red-700" role="alert">{saveError} <button onClick={()=>save()} className="underline">Reintentar</button></div>}
      <div className="recipe-workspace mt-6">
        <aside className="recipe-sidebar" aria-label="Progreso y secciones de la ficha">
          <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#8190a4]">Secciones</p>
          <div className="mt-3 flex items-center justify-between text-[12px]"><span className="font-medium">Progreso general</span><strong className="font-semibold text-[#1684a5]">{percentage}%</strong></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8edf3]" role="progressbar" aria-label="Completitud de la ficha" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}><span className="block h-full rounded-full bg-[#1684a5] transition-all" style={{width:`${percentage}%`}}/></div>
          <nav className="recipe-section-list mt-5" aria-label="Secciones de la receta">{sections.map(({id,label},index)=><button key={id} onClick={()=>selectSection(id)} aria-current={active===id?"step":undefined} className={`recipe-section-link ${active===id?"is-active":""}`}><span className={`recipe-section-number ${complete?.[id]?"is-complete":""}`}>{index+1}</span><span className="min-w-0 flex-1"><strong>{label}</strong><small>{["Identificación y origen","Insumos y técnicas","Elaboración paso a paso","Meses y celebraciones","Procedencia e informante","Fotografías y audio"][index]}</small></span>{complete?.[id]&&<Check className="size-3.5 shrink-0 text-[#55ad99]"/>}</button>)}</nav>

        </aside>
        <section id="recipe-form-panel" className={`recipe-form-card recipe-editor-panel ${active==="general"?"recipe-general-panel":""}`} aria-labelledby="recipe-section-title">
          <div className="recipe-panel-header"><div className="flex min-w-0 items-start gap-3"><current.icon className="mt-0.5 size-5 shrink-0 text-[#1684a5]" strokeWidth={1.7}/><div><h2 id="recipe-section-title" className="text-[20px] font-semibold tracking-tight">{current.label}</h2><p className="mt-1.5 text-[11px] leading-relaxed text-[#8190a4]">Sección {currentIndex+1} de 6 · {current.description}</p></div></div><span className="recipe-required-label">{active==="temporality"||active==="media"?"Sección opcional":"* Campos obligatorios"}</span></div>
          <div className="recipe-panel-fields">
      {active==="general"&&<GeneralSection recipe={recipe} update={update}/>}
      {active==="ingredients"&&<div className="recipe-ingredients-layout">
        <section className="ingredient-block" aria-labelledby="ingredients-block-title">
          <div className="ingredient-block-heading"><h3 id="ingredients-block-title">Ingredientes</h3><span>{recipe.ingredients.length} {recipe.ingredients.length===1?"ingrediente":"ingredientes"}</span></div>
          <p className="ingredient-block-description">Busca y añade los ingredientes de la receta.</p>
          <div className="ingredient-search-row mt-5"><div className="min-w-0 flex-1"><SearchSelect id="ingredient-select" value={selectedIngredient} options={ingredientOptions.filter(item=>!recipe.ingredients.includes(item)).map(item=>({value:item,label:item}))} placeholder="Buscar ingrediente" onChange={setSelectedIngredient}/></div><button type="button" className="acervo-primary" disabled={!selectedIngredient} onClick={()=>{if(selectedIngredient&&!recipe.ingredients.includes(selectedIngredient))update("ingredients",[...recipe.ingredients,selectedIngredient]);setSelectedIngredient("");}}><Plus className="size-3.5"/>Añadir</button></div>
          {!creatingIngredient?<button type="button" className="ingredient-create-link" onClick={()=>setCreatingIngredient(true)}>¿No aparece? Crear ingrediente</button>:<div className="mt-3 rounded-xl border border-[#e5eaf0] bg-[#fafbfd] p-3"><label htmlFor="custom-ingredient" className="mb-2 block text-[11px] font-medium text-[#748399]">Nuevo ingrediente</label><input id="custom-ingredient" autoFocus value={ingredientName} onChange={event=>setIngredientName(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();createIngredient();}}} placeholder="Nombre del ingrediente" className="acervo-input h-10 w-full bg-white"/><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={()=>{setCreatingIngredient(false);setIngredientName("");}} className="acervo-secondary">Cancelar</button><button type="button" disabled={!ingredientName.trim()} onClick={createIngredient} className="acervo-primary">Crear y añadir</button></div></div>}
          <div className="mt-5 border-t pt-1">{recipe.ingredients.length?<ol className="ingredient-selected-list">{recipe.ingredients.map((item,index)=><li key={item}><span className="ingredient-row-number">{String(index+1).padStart(2,"0")}</span><span className="min-w-0 flex-1 break-words text-[12px]">{item}</span><button type="button" aria-label={`Quitar ingrediente ${item}`} onClick={()=>update("ingredients",recipe.ingredients.filter(value=>value!==item))} className="ingredient-remove"><X className="size-3.5"/></button></li>)}</ol>:<p className="py-6 text-center text-[11px] leading-relaxed text-[#8a97a9]">Aún no has añadido ingredientes.<br/>Empieza buscándolos en el catálogo.</p>}</div>
        </section>
        <section className="ingredient-block" aria-labelledby="techniques-block-title">
          <div className="ingredient-block-heading"><h3 id="techniques-block-title">Técnicas tradicionales</h3><span>{recipe.techniques.length} {recipe.techniques.length===1?"seleccionada":"seleccionadas"}</span></div>
          <p className="ingredient-block-description">Marca todas las técnicas que se utilizan.</p>
          <div className="technique-grid mt-5">{traditionalTechniques.map(technique=>{const checked=recipe.techniques.includes(technique);return <label key={technique} className={`technique-option ${checked?"is-selected":""}`}><input type="checkbox" checked={checked} onChange={()=>update("techniques",checked?recipe.techniques.filter(item=>item!==technique):[...recipe.techniques,technique])}/><span>{technique}</span></label>;})}</div>
        </section>
      </div>}
      {active==="preparation"&&<PreparationSection recipe={recipe} update={update}/>}
      {active==="temporality"&&<TemporalitySection recipe={recipe} update={update}/>}
      {active==="source"&&<SourceSection recipe={recipe} update={update}/>}
      {active==="media"&&<MediaSection recipe={recipe} update={update} addFiles={addFiles} busy={readingFiles}/>}
          </div>
          <footer className="recipe-panel-footer"><button className="acervo-secondary" onClick={returnToList}><ArrowLeft className="size-3.5"/>Volver a Recetas</button><div className="flex items-center gap-2"><button className="acervo-secondary" disabled={currentIndex===0} onClick={()=>selectSection(sections[currentIndex-1].id)}>Anterior</button>{currentIndex<sections.length-1?<button className="acervo-primary" onClick={()=>selectSection(sections[currentIndex+1].id)}>Siguiente<ArrowRight className="size-3.5"/></button>:<button className="acervo-primary" onClick={()=>save()} disabled={saving||readingFiles}><Save className="size-3.5"/>Guardar ficha</button>}</div></footer>
        </section>
      </div>
    </>}
  </div></main></div>;
}

type Update=<K extends keyof RecipeRecord>(key:K,value:RecipeRecord[K])=>void;
function Field({label,hint,htmlFor,children}:{label:string;hint?:string;htmlFor?:string;children:React.ReactNode}){return <div><div className="mb-2.5 flex flex-wrap items-center justify-between gap-2"><Label htmlFor={htmlFor} className="text-[12px] font-medium text-[#52647d]">{label}</Label>{hint&&<span className="text-[10px] text-[#8a97a9]">{hint}</span>}</div>{children}</div>;}
function SimpleSelect({id,value,options,placeholder,onChange}:{id?:string;value:string;options:string[];placeholder:string;onChange:(value:string)=>void}){return <Select value={value||undefined} onValueChange={onChange}><SelectTrigger id={id} aria-label={placeholder} className="h-11 w-full rounded-xl border-[#e5eaf0] bg-[#f8fafc] text-xs shadow-none"><SelectValue placeholder={placeholder}/></SelectTrigger><SelectContent>{options.map(option=><SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;}
function GeneralSection({recipe,update}:{recipe:RecipeRecord;update:Update}){
  const duplicates=readRecipes().filter(item=>item.id!==recipe.id&&normalizeText(item.name)===normalizeText(recipe.name));
  return <div className="general-data-form">
    <section className="general-data-block" aria-labelledby="recipe-identification-title">
      <h3 id="recipe-identification-title" className="general-block-title">Identificación</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Field label="Nombre de la receta *" htmlFor="recipe-name"><Input id="recipe-name" value={recipe.name} onChange={event=>update("name",event.target.value)} className="acervo-input h-11"/></Field>
        <Field label="Categoría *" htmlFor="recipe-category"><SimpleSelect id="recipe-category" value={recipe.category} options={recipeCategories} placeholder="Seleccionar categoría" onChange={value=>update("category",value)}/></Field>
      </div>
      {duplicates.length>0&&<p className="mt-4 rounded-xl bg-[#fff8ed] p-3 text-xs text-[#aa803d]">Existe otra ficha de «{duplicates[0].name}» en {duplicates[0].municipality}. Puedes continuar si estás documentando una variante.</p>}
    </section>
    <section className="general-data-block" aria-labelledby="recipe-origin-title">
      <h3 id="recipe-origin-title" className="general-block-title">Origen y vigencia</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Field label="Municipio *" htmlFor="editor-municipality"><MunicipalityField id="editor-municipality" value={recipe.municipalityCode} onChange={(item,region)=>{update("municipality",item?.name??"");update("municipalityCode",item?.code??"");update("region",region);}}/></Field>
        <Field label="Región" htmlFor="recipe-region" hint="Asignada automáticamente"><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-3.5 size-3.5 text-[#9aa6b5]"/><Input id="recipe-region" readOnly value={recipe.region||"Sin asignar"} className="acervo-input region-readonly h-11 text-[#8190a4]"/></div></Field>
      </div>
      <div className="mt-3"><Field label="Vigencia *"><div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Vigencia">{recipeVigencies.map(option=><button key={option} type="button" aria-pressed={recipe.vigency===option} onClick={()=>update("vigency",option)} className={`recipe-radio-choice ${recipe.vigency===option?"is-selected":""}`}><span className="recipe-radio-dot"/>{option}</button>)}</div></Field></div>
    </section>
    <section className="general-data-block" aria-labelledby="recipe-description-title">
      <div className="flex items-center justify-between gap-3"><h3 id="recipe-description-title" className="general-block-title">Descripción <span className="text-[#8a97a9]">*</span></h3><span className="text-[10px] tabular-nums text-[#8a97a9]">{recipe.description.length} caracteres</span></div>
      <label htmlFor="recipe-description" className="sr-only">Descripción de la receta</label><Textarea id="recipe-description" value={recipe.description} onChange={event=>update("description",event.target.value)} rows={3} placeholder="Describe la preparación y su importancia cultural o histórica." className="acervo-input mt-3 min-h-24"/>
    </section>
  </div>;
}
function PreparationSection({recipe,update}:{recipe:RecipeRecord;update:Update}){return <div className="space-y-4">{recipe.steps.map((step,index)=><div key={index} className="flex items-start gap-3 rounded-2xl border border-[#e5eaf0] bg-[#fafbfd] p-4"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#eaf5f9] text-xs font-semibold text-[#1684a5]">{String(index+1).padStart(2,"0")}</span><div className="min-w-0 flex-1"><label htmlFor={`recipe-step-${index}`} className="mb-2 block text-[11px] font-medium text-[#8190a4]">Paso {index+1}</label><Textarea id={`recipe-step-${index}`} value={step} onChange={event=>{const steps=[...recipe.steps];steps[index]=event.target.value;update("steps",steps);}} placeholder="Describe este paso de la preparación…" className="acervo-input min-h-24 bg-white"/></div><Button aria-label={`Eliminar paso ${index+1}`} variant="ghost" size="icon" onClick={()=>update("steps",recipe.steps.filter((_,itemIndex)=>itemIndex!==index))} className="size-8 text-[#9aa6b5]"><Trash2 className="size-4"/></Button></div>)}<button onClick={()=>update("steps",[...recipe.steps,""])} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#badce7] text-xs text-[#1684a5]"><Plus className="size-4"/>Agregar paso</button></div>;}
function TemporalitySection({recipe,update}:{recipe:RecipeRecord;update:Update}) {
  const allYear=recipeMonths.every(month=>recipe.months.includes(month));
  return <div className="temporality-layout">
    <section className="ingredient-block" aria-labelledby="preparation-months-title">
      <div className="ingredient-block-heading"><h3 id="preparation-months-title">Meses de preparación</h3><span>{recipe.months.length} {recipe.months.length===1?"mes":"meses"}</span></div>
      <p className="ingredient-block-description">Selecciona los meses en que se prepara la receta.</p>
      <label className="all-year-control mt-4"><input type="checkbox" checked={allYear} onChange={event=>update("months",event.target.checked?[...recipeMonths]:[])}/><span>Todo el año</span></label>
      <div className="month-grid mt-3" role="group" aria-label="Meses de preparación">{recipeMonths.map(month=>{const selected=recipe.months.includes(month);return <button key={month} type="button" aria-pressed={selected} className={`month-option ${selected?"is-selected":""}`} onClick={()=>update("months",selected?recipe.months.filter(item=>item!==month):recipeMonths.filter(item=>item===month||recipe.months.includes(item)))}>{month}</button>;})}</div>
    </section>
    <section className="ingredient-block" aria-labelledby="recipe-occasions-title">
      <div className="ingredient-block-heading"><h3 id="recipe-occasions-title">Ocasiones</h3><span>{recipe.occasions.length} {recipe.occasions.length===1?"seleccionada":"seleccionadas"}</span></div>
      <p className="ingredient-block-description">Marca las celebraciones o los usos de la preparación.</p>
      <div className="technique-grid mt-4">{recipeOccasions.map(occasion=>{const selected=recipe.occasions.includes(occasion);return <label key={occasion} className={`technique-option occasion-option ${selected?"is-selected":""}`}><input type="checkbox" checked={selected} onChange={()=>update("occasions",selected?recipe.occasions.filter(item=>item!==occasion):[...recipe.occasions,occasion])}/><span>{occasion}</span></label>;})}</div>
    </section>
  </div>;
}
function SourceSection({recipe,update}:{recipe:RecipeRecord;update:Update}) {
  const isInterview=recipe.source==="Entrevista de campo";
  const referencePlaceholders:Record<string,string>={
    "Documento histórico":"Nombre del documento, archivo donde se conserva y página o folio.",
    "Publicación":"Título del libro o artículo, autor, año y páginas consultadas.",
    "Portal oficial (SIC u otro)":"Título de la página y nombre de la institución responsable.",
    "Recetario comunitario":"Nombre del recetario, comunidad, año y página, si se conocen.",
  };
  return <div className="space-y-6">
    <Field label="Tipo de fuente" hint="Elige la procedencia principal"><div className="source-choice-grid" role="group" aria-label="Tipo de fuente">{recipeSources.map((source,index)=>{const Icon=[Mic2,ScrollText,BookOpen,Globe2,NotebookTabs][index];const selected=recipe.source===source;return <button key={source} type="button" aria-pressed={selected} onClick={()=>update("source",source)} className={`recipe-choice-tile source-choice ${selected?"is-selected":""}`}><Icon className="size-6" strokeWidth={1.6}/><span>{source}</span>{selected&&<Check className="absolute right-2.5 top-2.5 size-3.5"/>}</button>;})}</div></Field>
    {isInterview?<div className="rounded-2xl border border-[#e1edf2] bg-[#f6fafc] p-5">
      <h3 className="mb-5 flex items-center gap-2 text-sm font-medium"><Mic2 className="size-4 text-[#1684a5]"/>Datos de la entrevista</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nombre del informante" htmlFor="informant-name"><Input id="informant-name" value={recipe.informant.name} onChange={event=>update("informant",{...recipe.informant,name:event.target.value})} placeholder="Nombre completo" className="acervo-input h-11 bg-white"/></Field>
        <Field label="Rol" htmlFor="informant-role"><SimpleSelect id="informant-role" value={recipe.informant.role} options={informantRoles} placeholder="Seleccionar rol" onChange={value=>update("informant",{...recipe.informant,role:value})}/></Field>
        <Field label="Fecha de la entrevista" htmlFor="interview-date"><Input id="interview-date" type="date" value={recipe.informant.interviewDate} onChange={event=>update("informant",{...recipe.informant,interviewDate:event.target.value})} className="acervo-input h-11 bg-white"/></Field>
      </div>
    </div>:<>
      <Field label="Referencia" htmlFor="recipe-reference"><Textarea id="recipe-reference" value={recipe.sourceReference} onChange={event=>update("sourceReference",event.target.value)} rows={3} placeholder={referencePlaceholders[recipe.source]??"Describe el documento o la publicación consultada."} className="acervo-input min-h-24"/></Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Enlace de la fuente" hint="Opcional" htmlFor="recipe-source-url"><Input id="recipe-source-url" type="url" inputMode="url" value={recipe.sourceUrl} onChange={event=>update("sourceUrl",event.target.value)} placeholder="https://…" className="acervo-input h-11 w-full"/></Field>
        <Field label="Fecha de consulta" htmlFor="recipe-consultation"><Input id="recipe-consultation" type="date" value={recipe.consultationDate} onChange={event=>update("consultationDate",event.target.value)} className="acervo-input h-11 w-full"/></Field>
      </div>
    </>}
  </div>;
}
function MediaSection({recipe,update,addFiles,busy}:{recipe:RecipeRecord;update:Update;addFiles:(files:FileList|File[]|null)=>Promise<void>;busy:boolean}) {
  const fileInput=useRef<HTMLInputElement>(null);
  const uploadOptions=[{key:"photos" as const},{key:"audio" as const}];
  const total=recipe.photos.length+recipe.audio.length;
  return <div className="space-y-5" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(!busy)void addFiles(event.dataTransfer.files);}}>
    <div className="media-upload-toolbar">
      <button type="button" className="acervo-primary" disabled={busy} onClick={()=>fileInput.current?.click()}><UploadCloud className="size-4"/>{busy?"Preparando archivos…":"Subir archivo"}</button>
      <div className="text-[10px] leading-5 text-[#8190a4]"><p>Fotos: JPG, PNG o WEBP · Hasta 8 MB</p><p>Audio: MP3, M4A o WAV · Hasta 20 MB</p></div>
      <input ref={fileInput} aria-label="Seleccionar fotos o audio" type="file" disabled={busy} multiple accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav" className="sr-only" onChange={event=>{void addFiles(event.currentTarget.files);event.currentTarget.value="";}}/>
    </div>
    {!total&&<p className="rounded-xl border border-[#e5eaf0] bg-[#fafbfd] px-4 py-5 text-center text-[11px] text-[#8190a4]">Aún no hay archivos adjuntos. Usa «Subir archivo» o arrastra tus fotos y audios aquí.</p>}
    {total>0&&<section aria-label="Archivos adjuntos"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-[12px] font-medium">Archivos adjuntos</h3><span className="text-[11px] text-[#8190a4]">{recipe.photos.length} {recipe.photos.length===1?"foto":"fotos"} · {recipe.audio.length} {recipe.audio.length===1?"audio":"audios"}</span></div>
      <div className="media-attachments-grid">{uploadOptions.flatMap(({key})=>recipe[key].map(item=>
        <article key={item.id} className="media-attachment-card">
          <div className={`media-attachment-preview ${key==="audio"?"is-audio":""}`}>
            {key==="photos"?<img src={item.url} alt={item.caption||item.name}/>:<><span className="media-audio-symbol"><FileAudio className="size-6" strokeWidth={1.3}/></span><audio aria-label={`Reproducir ${item.name}`} src={item.url} controls preload="metadata"/></>}
            <span className="media-type-badge">{key==="photos"?"Fotografía":"Audio"}</span>
            <button type="button" disabled={busy} aria-label={`Quitar ${key==="photos"?"foto":"audio"} ${item.name}`} onClick={()=>update(key,recipe[key].filter(media=>media.id!==item.id))} className="media-remove-button"><X className="size-3.5"/></button>
          </div>
          <div className="p-3"><p title={item.name} className="truncate text-[11px] font-medium text-[#52647d]">{item.name}</p><p className="mb-3 mt-1 text-[10px] text-[#8190a4]">{item.size<1024*1024?`${Math.max(1,Math.round(item.size/1024))} KB`:`${(item.size/(1024*1024)).toFixed(1)} MB`}</p><input aria-label={`Descripción de ${item.name}`} value={item.caption} onChange={event=>update(key,recipe[key].map(media=>media.id===item.id?{...media,caption:event.target.value}:media))} placeholder="Añade una descripción" className="acervo-input h-9 w-full text-[10px]"/></div>
        </article>
      ))}</div>
    </section>}
  </div>;
}
