"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, AudioLines, BookOpen, CalendarDays, ChefHat, Clock3, MapPin, Mic2, Search, ShoppingBasket, Network, Sprout, Users, Wheat } from "lucide-react";
import { SectionShell } from "@/components/integration/section-shell";
import { usePublicCatalog } from "@/components/public/public-catalog-provider";
import type { RecipeRecord } from "@/data/recipes";
import type { CookRecord } from "@/data/cooks";
import type { IngredientRecord } from "@/data/ingredients";
import type { Episode } from "@/data/podcasts";
import styles from "./catalog.module.css";

type Resource = "recipes" | "cooks" | "ingredients" | "episodes";
type Entry = RecipeRecord | CookRecord | IngredientRecord | Episode;
const config = {
  recipes: {title:"Recetas",description:"Explora las preparaciones, los ingredientes y los saberes de la cocina poblana.",singular:"receta",empty:"Aún no hay recetas publicadas.",href:"/recetas",icon:BookOpen},
  cooks: {title:"Cocineras y cocineros",description:"Conoce a quienes conservan y transmiten los saberes gastronómicos de Puebla.",singular:"ficha",empty:"Aún no hay fichas de cocineras y cocineros publicadas.",href:"/cocineras",icon:ChefHat},
  ingredients: {title:"Ingredientes",description:"Descubre los productos, sus temporadas y sus vínculos con las preparaciones de Puebla.",singular:"ingrediente",empty:"Aún no hay ingredientes publicados.",href:"/ingredientes",icon:Wheat},
  episodes: {title:"Podcast",description:"Escucha las historias, las conversaciones y los saberes del observatorio.",singular:"capítulo",empty:"Aún no hay capítulos publicados.",href:"/podcast",icon:Mic2},
};

const normalize = (text:string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-MX").trim();
const nameOf = (entry:Entry) => "title" in entry ? entry.title : entry.name;
const descriptionOf = (entry:Entry) => "biography" in entry ? entry.biography : entry.description;
const categoryOf = (entry:Entry) => "category" in entry ? entry.category : "role" in entry ? entry.role : entry.format === "video" ? "Video" : "Podcast";
const recordHref = (resource:Resource,id:string) => `${config[resource].href}/${encodeURIComponent(id)}`;
const connected = (relations:{source:string;target:string}[],a:string,b:string) => relations.some(edge=>(edge.source===a&&edge.target===b)||(edge.source===b&&edge.target===a));
const hasName = (names:string[],name:string) => names.some(item=>normalize(item)===normalize(name));

// Do not render blob URLs, executable URLs, or arbitrary data documents from records.
export function publicMediaUrl(value:string,kind:"image"|"audio"="image"):string|undefined {
  if(!value)return undefined;
  if(value.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\"))return value;
  if(kind==="image"&&/^data:image\/(?:png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=\r\n]+$/.test(value))return value;
  try {const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password?url.href:undefined;} catch {return undefined;}
}

function State({loading,error,reload,children}:{loading:boolean;error:string|null;reload:()=>void;children:ReactNode}) {
  if(loading)return <div className={styles.empty} role="status"><BookOpen/><p>Cargando información del observatorio…</p></div>;
  if(error)return <div className={styles.empty} role="alert"><BookOpen/><h2>No se pudo cargar la información</h2><p>{error}</p><button className={styles.button} onClick={reload}>Reintentar</button></div>;
  return children;
}

export function PublicCatalog({resource}:{resource:Resource}) {
  const catalog=usePublicCatalog();
  const [search,setSearch]=useState("");
  const [category,setCategory]=useState("");
  const [municipality,setMunicipality]=useState("");
  const items:Entry[]=catalog[resource];
  const categories=[...new Set(items.map(categoryOf).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
  const municipalities=[...new Set(items.map(item=>item.municipality).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
  const filtered=items.filter(item=>(!category||categoryOf(item)===category)&&(!municipality||item.municipality===municipality)&&normalize(`${nameOf(item)} ${descriptionOf(item)} ${item.municipality} ${"region" in item?item.region:""} ${categoryOf(item)}`).includes(normalize(search)));
  const {title,description,icon:Icon}=config[resource];
  const reset=()=>{setSearch("");setCategory("");setMunicipality("");};
  return <SectionShell activeItem={title}><div className={styles.page}>
    <header className={styles.heading}><div><div className={styles.eyebrow}>Acervo gastronómico</div><h1>{title}</h1><p>{description}</p></div>{resource==="recipes"&&<Link href="/recetario" className={styles.button}><BookOpen size={16}/>Leer recetario</Link>}</header>
    <State loading={catalog.loading} error={catalog.error} reload={catalog.reload}>
      {!!items.length&&<><div className={styles.toolbar} role="search"><label className={styles.search}><Search size={17} aria-hidden="true"/><input aria-label={`Buscar ${title.toLocaleLowerCase("es")}`} placeholder="Buscar por nombre, municipio o tema…" value={search} onChange={event=>setSearch(event.target.value)}/></label><select aria-label="Filtrar por categoría" value={category} onChange={event=>setCategory(event.target.value)}><option value="">Todas las categorías</option>{categories.map(value=><option key={value}>{value}</option>)}</select><select aria-label="Filtrar por municipio" value={municipality} onChange={event=>setMunicipality(event.target.value)}><option value="">Todos los municipios</option>{municipalities.map(value=><option key={value}>{value}</option>)}</select>{(search||category||municipality)&&<button className={styles.button} onClick={reset}>Limpiar filtros</button>}</div><p className={styles.count} role="status">{filtered.length} {filtered.length===1?"resultado":"resultados"}</p></>}
      {!!filtered.length?<div className={styles.grid}>{filtered.map(item=><article key={item.id} className={styles.card}>
        <div className={styles.cover}>{"photos" in item&&item.photos[0]&&publicMediaUrl(item.photos[0].url)?<Image src={publicMediaUrl(item.photos[0].url)!} alt="" fill unoptimized sizes="(max-width:700px) 100vw, (max-width:1000px) 50vw, 33vw"/>:<Icon aria-hidden="true"/>}</div>
        <div className={styles.body}>{categoryOf(item)&&<span className={styles.tag}>{categoryOf(item)}</span>}<h2><Link href={recordHref(resource,item.id)}>{nameOf(item)}</Link></h2><p>{descriptionOf(item)||"Consulta la ficha para conocer más."}</p>{item.municipality&&<div className={styles.location}><MapPin size={13}/>{item.municipality}</div>}<Link href={recordHref(resource,item.id)} className={styles.cardLink}>{resource==="episodes"?"Ver capítulo":"Ver ficha"}<ArrowRight size={15}/></Link></div>
      </article>)}</div>:<div className={styles.empty}><Icon/><h2>{items.length?"No encontramos resultados":config[resource].empty}</h2><p>{items.length?"Prueba con otro nombre o ajusta los filtros.":resource==="episodes"?"Los capítulos estarán disponibles aquí cuando se publiquen.":"Las fichas estarán disponibles aquí cuando se publiquen en el observatorio."}</p>{!!items.length&&<button className={styles.button} onClick={reset}>Ver todo</button>}</div>}
    </State>
  </div></SectionShell>;
}

function Panel({title,icon:Icon,children}:{title:string;icon?:typeof BookOpen;children:ReactNode}) {
  return <section className={styles.panel}><h2>{Icon&&<Icon size={16}/>} {title}</h2>{children}</section>;
}

function Tags({items}:{items:string[]}) {return <div className={styles.chips}>{items.map((item,index)=><span key={`${item}-${index}`} className={styles.tag}>{item}</span>)}</div>;}

function Related({resource,items}:{resource:Resource;items:Entry[]}) {return <div className={styles.related}>{items.map(item=><Link key={item.id} href={recordHref(resource,item.id)}>{nameOf(item)}<ArrowRight size={14}/></Link>)}</div>;}

function Location({entry}:{entry:Entry}) {
  return <Panel title="Lugar y contexto" icon={MapPin}><dl className={styles.facts}>{entry.municipality&&<div><dt>Municipio</dt><dd>{entry.municipality}</dd></div>}{"region" in entry&&entry.region&&<div><dt>Región</dt><dd>{entry.region}</dd></div>}{"community" in entry&&entry.community&&<div><dt>Comunidad</dt><dd>{entry.community}</dd></div>}</dl>{entry.municipalityCode&&<Link href={`/mapa?municipio=${encodeURIComponent(entry.municipalityCode)}`} className={`${styles.button} mt-5`}><MapPin size={14}/>Explorar en el mapa</Link>}</Panel>;
}

function Gallery({entry}:{entry:RecipeRecord|CookRecord|IngredientRecord}) {
  const images=entry.photos.filter(photo=>publicMediaUrl(photo.url));
  if(!images.length)return null;
  return <Panel title="Galería"><div className={styles.gallery}>{images.map((photo,index)=>{const caption="caption" in photo&&typeof photo.caption==="string"?photo.caption:"";return <figure key={photo.id||index}><Image src={publicMediaUrl(photo.url)!} alt={caption||entry.name} width={640} height={480} unoptimized/>{caption&&<figcaption>{caption}</figcaption>}</figure>;})}</div></Panel>;
}

function RecipeContent({recipe}:{recipe:RecipeRecord}) {
  const {cooks,ingredients,episodes,relations}=usePublicCatalog();
  const linkedIngredients=ingredients.filter(ingredient=>hasName(recipe.ingredients,ingredient.name)||hasName(ingredient.linkedRecipes,recipe.name)||ingredient.linkedRecipes.includes(recipe.id)||connected(relations,recipe.id,ingredient.id));
  const linkedCooks=cooks.filter(cook=>hasName(cook.linkedRecipes,recipe.name)||cook.linkedRecipes.includes(recipe.id)||connected(relations,recipe.id,cook.id));
  const linkedEpisodes=episodes.filter(episode=>episode.recipeIds.includes(recipe.id)||connected(relations,recipe.id,episode.id));
  const audios=recipe.audio.filter(audio=>publicMediaUrl(audio.url,"audio"));
  return <div className={styles.detailGrid}><div className={styles.stack}>
    {recipe.description&&<Panel title="Sobre esta preparación" icon={BookOpen}><p>{recipe.description}</p></Panel>}
    {!!recipe.ingredients.length&&<Panel title="Ingredientes" icon={Wheat}><div className={styles.chips}>{recipe.ingredients.map((name,index)=>{const linked=linkedIngredients.find(item=>normalize(item.name)===normalize(name));return linked?<Link key={`${name}-${index}`} href={recordHref("ingredients",linked.id)} className={styles.tag}>{name}</Link>:<span key={`${name}-${index}`} className={styles.tag}>{name}</span>;})}</div></Panel>}
    {(!!recipe.steps.length||recipe.preparation)&&<Panel title="Preparación" icon={BookOpen}>{recipe.steps.length?<ol>{recipe.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>:<p>{recipe.preparation}</p>}</Panel>}
    {!!recipe.techniques.length&&<Panel title="Técnicas y saberes"><Tags items={recipe.techniques}/></Panel>}
    <Gallery entry={recipe}/>
    {!!audios.length&&<Panel title="Escuchar la preparación" icon={AudioLines}><div className={styles.audio}>{audios.map((audio,index)=><div key={audio.id||index}><p>{audio.caption||audio.name}</p><audio controls preload="none" src={publicMediaUrl(audio.url,"audio")}/></div>)}</div></Panel>}
  </div><aside className={styles.stack}>
    <Location entry={recipe}/>
    {!!linkedIngredients.length&&<Panel title="Fichas de ingredientes" icon={Wheat}><Related resource="ingredients" items={linkedIngredients}/></Panel>}
    {(!!recipe.months.length||!!recipe.occasions.length||recipe.vigency)&&<Panel title="Temporadas y celebraciones" icon={CalendarDays}><dl className={styles.facts}>{recipe.months.length>0&&<div><dt>Temporada</dt><dd>{recipe.months.join(", ")}</dd></div>}{recipe.occasions.length>0&&<div><dt>Celebraciones y ocasiones</dt><dd>{recipe.occasions.join(", ")}</dd></div>}{recipe.vigency&&<div><dt>Tradición</dt><dd>{recipe.vigency}</dd></div>}</dl></Panel>}
    {!!linkedCooks.length&&<Panel title="Cocineras y cocineros" icon={ChefHat}><Related resource="cooks" items={linkedCooks}/></Panel>}
    {!!linkedEpisodes.length&&<Panel title="Capítulos relacionados" icon={Mic2}><Related resource="episodes" items={linkedEpisodes}/></Panel>}
    <Link href="/recetario" className={styles.button}><BookOpen size={16}/>Explorar recetario</Link>
  </aside></div>;
}

function CookContent({cook}:{cook:CookRecord}) {
  const {recipes,relations}=usePublicCatalog();
  const linked=recipes.filter(recipe=>hasName(cook.linkedRecipes,recipe.name)||cook.linkedRecipes.includes(recipe.id)||connected(relations,recipe.id,cook.id));
  return <div className={styles.detailGrid}><div className={styles.stack}>
    {cook.quote&&<blockquote className={styles.quote}>“{cook.quote}”</blockquote>}
    {cook.biography&&<Panel title="Biografía" icon={ChefHat}><p>{cook.biography}</p></Panel>}
    {!!cook.specialties.length&&<Panel title="Especialidades"><Tags items={cook.specialties}/></Panel>}
    {!!linked.length&&<Panel title="Recetas compartidas" icon={BookOpen}><Related resource="recipes" items={linked}/></Panel>}
    {!!cook.oralHistories.length&&<Panel title="Historias y memorias" icon={AudioLines}><div className={styles.oral}>{cook.oralHistories.map((history,index)=>{const url=publicMediaUrl(history.url,"audio");return <div key={history.id||index} className={styles.oralItem}><strong>{history.title}</strong><small>{[history.date,history.duration].filter(Boolean).join(" · ")}</small>{url&&<audio controls preload="none" src={url} className="w-full"/>}</div>;})}</div></Panel>}
    <Gallery entry={cook}/>
  </div><aside className={styles.stack}>
    <Location entry={cook}/>
    {(cook.yearsExperience||cook.languages.length||cook.collective||cook.studentCount>0)&&<Panel title="Saberes y comunidad" icon={Users}><dl className={styles.facts}>{cook.yearsExperience&&<div><dt>Años de experiencia</dt><dd>{cook.yearsExperience}</dd></div>}{!!cook.languages.length&&<div><dt>Lenguas</dt><dd>{cook.languages.join(", ")}</dd></div>}{cook.collective&&<div><dt>Colectivo</dt><dd>{cook.collective}</dd></div>}{cook.studentCount>0&&<div><dt>Personas a quienes ha enseñado</dt><dd>{cook.studentCount}</dd></div>}</dl></Panel>}
    {!!cook.culinaryLineage.length&&<Panel title="Linaje culinario"><ul>{cook.culinaryLineage.map((name,index)=><li key={index}>{name}</li>)}</ul></Panel>}
    {cook.recognitions&&<Panel title="Reconocimientos"><p>{cook.recognitions}</p></Panel>}
    {!!cook.establishments.length&&<Panel title="Establecimientos vinculados"><ul>{cook.establishments.map((name,index)=><li key={index}>{name}</li>)}</ul></Panel>}
  </aside></div>;
}

function IngredientContent({ingredient}:{ingredient:IngredientRecord}) {
  const {recipes,episodes,relations}=usePublicCatalog();
  const linked=recipes.filter(recipe=>hasName(recipe.ingredients,ingredient.name)||hasName(ingredient.linkedRecipes,recipe.name)||ingredient.linkedRecipes.includes(recipe.id)||connected(relations,recipe.id,ingredient.id));
  const linkedEpisodes=episodes.filter(episode=>episode.ingredientIds.includes(ingredient.id)||connected(relations,episode.id,ingredient.id));
  return <div className={styles.detailGrid}><div className={styles.stack}>
    {ingredient.description&&<Panel title="Sobre este ingrediente" icon={Sprout}><p>{ingredient.description}</p></Panel>}
    {!!ingredient.localNames.length&&<Panel title="Nombres locales"><Tags items={ingredient.localNames}/></Panel>}
    {!!ingredient.varieties.length&&<Panel title="Variedades"><Tags items={ingredient.varieties}/></Panel>}
    {!!ingredient.uses.length&&<Panel title="Usos gastronómicos"><Tags items={ingredient.uses}/></Panel>}
    {!!linked.length&&<Panel title="Recetas relacionadas" icon={BookOpen}><Related resource="recipes" items={linked}/></Panel>}
    <Gallery entry={ingredient}/>
  </div><aside className={styles.stack}><Location entry={ingredient}/>{(ingredient.season||ingredient.months.length>0)&&<Panel title="Temporada" icon={CalendarDays}>{ingredient.season&&<p>{ingredient.season}</p>}{!!ingredient.months.length&&<div className="mt-3"><Tags items={ingredient.months}/></div>}</Panel>}{!!linkedEpisodes.length&&<Panel title="Capítulos relacionados" icon={Mic2}><Related resource="episodes" items={linkedEpisodes}/></Panel>}</aside></div>;
}

function EpisodeContent({episode}:{episode:Episode}) {
  const {recipes,ingredients,relations}=usePublicCatalog();
  const linkedRecipes=recipes.filter(recipe=>episode.recipeIds.includes(recipe.id)||connected(relations,recipe.id,episode.id));
  const linkedIngredients=ingredients.filter(ingredient=>episode.ingredientIds.includes(ingredient.id)||connected(relations,episode.id,ingredient.id));
  const validYoutube=/^[A-Za-z0-9_-]{11}$/.test(episode.youtubeId);
  const publicLinks=(episode.links||[]).filter(link=>publicMediaUrl(link.url,"audio"));
  const publicAudio=(episode.audio||[]).filter(audio=>publicMediaUrl(audio.url,"audio"));
  return <div className={styles.detailGrid}><div className={styles.stack}>
    {validYoutube&&<iframe title={episode.title} src={`https://www.youtube-nocookie.com/embed/${episode.youtubeId}`} className={styles.video} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"/>}
    {!!publicAudio.length&&<Panel title="Escuchar capítulo" icon={AudioLines}>{publicAudio.map((audio,index)=><div key={audio.id||index} className="mb-4"><p>{audio.caption||audio.name||episode.title}</p><audio controls preload="none" className="mt-3 w-full" src={publicMediaUrl(audio.url,"audio")}/></div>)}</Panel>}
    {!!publicLinks.length&&<Panel title="Consultar capítulo" icon={Mic2}><div className={styles.related}>{publicLinks.map((link,index)=><a key={index} href={publicMediaUrl(link.url,"audio")} target="_blank" rel="noopener noreferrer">{link.label||"Escuchar en su plataforma"}<ArrowRight size={14}/></a>)}</div></Panel>}
    {episode.description&&<Panel title="Sobre este capítulo" icon={Mic2}><p>{episode.description}</p></Panel>}
    {!!linkedRecipes.length&&<Panel title="Recetas del capítulo" icon={BookOpen}><Related resource="recipes" items={linkedRecipes}/></Panel>}
    {!!linkedIngredients.length&&<Panel title="Ingredientes del capítulo" icon={Wheat}><Related resource="ingredients" items={linkedIngredients}/></Panel>}
  </div><aside className={styles.stack}>
    <Panel title="Este capítulo" icon={Clock3}><dl className={styles.facts}><div><dt>Formato</dt><dd>{episode.format==="video"?"Video":"Podcast"}</dd></div>{episode.date&&<div><dt>Fecha</dt><dd>{episode.date}</dd></div>}{episode.participants&&<div><dt>Participantes</dt><dd>{episode.participants}</dd></div>}</dl></Panel>
    {episode.municipality&&<Location entry={episode}/>}
  </aside></div>;
}

export function PublicDetail({resource,id}:{resource:Resource;id:string}) {
  const catalog=usePublicCatalog();
  const entry=(catalog[resource] as Entry[]).find(item=>item.id===id);
  const {title,icon:Icon,href}=config[resource];
  return <SectionShell activeItem={title}><div className={styles.page}><Link className={styles.back} href={href}><ArrowLeft size={15}/>Volver a {title.toLocaleLowerCase("es")}</Link>
    <State loading={catalog.loading} error={catalog.error} reload={catalog.reload}>
      {entry?<><header className={styles.heading}><div><div className={styles.eyebrow}>{title}</div><h1>{nameOf(entry)}</h1><p>{[categoryOf(entry),entry.municipality].filter(Boolean).join(" · ")}</p></div></header>{resource==="recipes"?<RecipeContent recipe={entry as RecipeRecord}/>:resource==="cooks"?<CookContent cook={entry as CookRecord}/>:resource==="ingredients"?<IngredientContent ingredient={entry as IngredientRecord}/>:<EpisodeContent episode={entry as Episode}/>}
        {"sourceReference" in entry&&entry.sourceReference&&<div className="mt-6"><Panel title="Fuente documental"><p>{entry.sourceReference}</p></Panel></div>}
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/red-conocimiento" className={styles.button}><Network size={16}/>Explorar la red de conocimiento</Link><Link href="/memoria" className={styles.button}><BookOpen size={16}/>Conocer la historia gastronómica</Link></div></>:<div className={styles.empty}><Icon/><h1 className="text-base font-semibold">Ficha no disponible</h1><p>La ficha que buscas aún no está publicada o ya no está disponible.</p><Link className={styles.button} href={href}>Explorar {title.toLocaleLowerCase("es")}</Link></div>}
    </State>
  </div></SectionShell>;
}

export function PublicMarkets() {
  return <SectionShell activeItem="Mercados y tianguis"><div className={styles.page}><header className={styles.heading}><div><div className={styles.eyebrow}>Acervo gastronómico</div><h1>Mercados y tianguis</h1><p>Espacios de encuentro y de intercambio de la gastronomía poblana.</p></div></header><div className={styles.empty}><ShoppingBasket/><h2>Próximamente, mercados y tianguis</h2><p>Los mercados y tianguis estarán disponibles aquí cuando se publiquen sus fichas.</p></div></div></SectionShell>;
}
