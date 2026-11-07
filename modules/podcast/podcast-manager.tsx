"use client";
/* eslint-disable @next/next/no-img-element -- Miniaturas externas servidas por YouTube. */
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, ExternalLink, MapPin, Mic2, MoreHorizontal, Pencil, Play, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useSessionUser } from "@/components/auth/session-provider";
import { ObservatorySidebar } from "@/components/dashboard/observatory-sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { blankEpisode, deleteEpisode, loadEpisodes, readEpisodes, saveEpisode, youtubeVideoId, type Episode } from "@/data/podcasts";
import { loadRecipes } from "@/data/recipe-storage";
import { loadIngredients } from "@/data/ingredient-storage";
import { MunicipalityField, normalizeText } from "@/modules/recipes/recipe-form-controls";

type Related = {id: string; name: string};
function usePodcastData() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [recipes, setRecipes] = useState<Related[]>([]);
  const [ingredients, setIngredients] = useState<Related[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadEpisodes(),loadIngredients()]).then(([records,related])=>{if(!cancelled){setEpisodes(records);setIngredients(related)}}).catch(cause=>{if(!cancelled)setError(cause instanceof Error?cause.message:"No se pudo abrir el catálogo. Recarga la página para volver a intentarlo.")}).finally(()=>{if(!cancelled)setLoaded(true)});
    loadRecipes().then(items => { if (!cancelled) setRecipes(items); }).catch(() => {
      if (!cancelled) toast.error("No se pudo cargar el catálogo de recetas relacionadas.");
    });
    return () => { cancelled = true; };
  }, []);
  return {episodes, setEpisodes, recipes, ingredients, loaded, error};
}
function Shell({children}: {children: ReactNode}) {
  return <div className="acervo-page min-h-screen text-[#173257]"><ObservatorySidebar activeItem="Podcast"/><main className="admin-main"><div className="mx-auto max-w-[1360px]">{children}</div></main></div>;
}
function Status({status}: {status: Episode["status"]}) {
  return <span className={`recipe-status ${status === "published" ? "status-verified" : "status-draft"}`}>{status === "published" ? "Publicado" : "Borrador"}</span>;
}
function Thumbnail({episode}: {episode: Episode}) {
  const [failed,setFailed]=useState(false);
  return <div className="podcast-thumbnail">{failed?<Mic2 className="podcast-cover-fallback" aria-hidden="true"/>:<img src={`https://i.ytimg.com/vi/${episode.youtubeId}/mqdefault.jpg`} alt="" loading="lazy" onLoad={event=>{if(event.currentTarget.naturalWidth<=120)setFailed(true);}} onError={()=>setFailed(true)}/>}<span className="podcast-play-overlay"><span><Play className="size-5" fill="currentColor" aria-hidden="true"/></span></span></div>;
}
export function EpisodeCard({episode,onEdit,onDraft,onDelete}:{episode:Episode;onEdit:()=>void;onDraft:()=>void;onDelete:()=>void}) {
  const date=episode.date?new Date(`${episode.date}T12:00:00`):null;
  const dateLabel=date&&!Number.isNaN(date.getTime())?new Intl.DateTimeFormat("es-MX",{dateStyle:"medium"}).format(date):"";
  return <article className="podcast-episode-card" aria-labelledby={`episode-title-${episode.id}`}>
    <Link href={`/podcast/${episode.id}`} className="podcast-cover-link" aria-label={`Abrir reproductor de ${episode.title}`}><Thumbnail episode={episode}/></Link>
    <div className="podcast-episode-content">
      <div className="podcast-episode-topline"><span className="podcast-format-label">{episode.format==="podcast"?<Mic2 className="size-3.5"/>:<Play className="size-3.5"/>}{episode.format==="podcast"?"Podcast":"Video"}</span><div className="flex items-center gap-2"><Status status={episode.status}/><DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="podcast-options-button" aria-label={`Opciones de ${episode.title}`}><MoreHorizontal className="size-4"/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="rounded-xl p-1.5"><DropdownMenuItem onSelect={onEdit}><Pencil className="size-4"/>Editar episodio</DropdownMenuItem><DropdownMenuItem asChild><a href={`https://www.youtube.com/watch?v=${episode.youtubeId}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4"/>Ver en YouTube</a></DropdownMenuItem>{episode.status==="published"&&<DropdownMenuItem onSelect={onDraft}>Pasar a borrador</DropdownMenuItem>}<DropdownMenuItem onSelect={onDelete} className="mt-1 gap-2 border-t pt-2 text-[#c74454] focus:bg-red-50 focus:text-[#ad3544]"><Trash2 className="size-4"/>Eliminar episodio</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div>
      <h2 id={`episode-title-${episode.id}`} className="podcast-episode-title"><Link href={`/podcast/${episode.id}`}>{episode.title}</Link></h2>
      {episode.description.trim()&&<p className="podcast-episode-description">{episode.description}</p>}
      {(episode.participants.trim()||episode.municipality)&&<div className="podcast-episode-metadata">{episode.participants.trim()&&<span title={episode.participants}><Users className="size-3.5" aria-hidden="true"/>Con {episode.participants}</span>}{episode.municipality&&<span><MapPin className="size-3.5" aria-hidden="true"/>{episode.municipality}</span>}</div>}
      <div className="podcast-episode-footer">{dateLabel&&<time dateTime={episode.date}><CalendarDays className="size-3.5" aria-hidden="true"/>{dateLabel}</time>}<Link href={`/podcast/${episode.id}`} aria-label={`Abrir episodio: ${episode.title}`}>Abrir episodio<ArrowRight className="size-3.5"/></Link></div>
    </div>
  </article>;
}
export function PodcastManager() {
  const {episodes, setEpisodes, recipes, ingredients, loaded, error} = usePodcastData();
  const [filter, setFilter] = useState<"all" | Episode["status"]>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing,setEditing]=useState<Episode|null>(null);
  const [pendingDelete,setPendingDelete]=useState<Episode|null>(null);
  const router = useRouter();
  const addEpisode=()=>{setEditing(null);setOpen(true);};
  const confirmDelete=async()=>{
    if(!pendingDelete)return;
    try{
      const removed=await deleteEpisode(pendingDelete.id);
      setEpisodes(readEpisodes());setPendingDelete(null);
      toast.success("Episodio eliminado",{duration:8000,action:{label:"Deshacer",onClick:async()=>{
        try{await saveEpisode(removed);setEpisodes(readEpisodes());toast.success("Episodio restaurado");}
        catch(cause){toast.error(cause instanceof Error?cause.message:"No se pudo restaurar el episodio.");}
      }}});
    }catch(cause){toast.error(cause instanceof Error?cause.message:"No se pudo eliminar el episodio.");}
  };
  const moveToDraft=async(episode:Episode)=>{
    try{await saveEpisode({...episode,status:"draft"});setEpisodes(readEpisodes());toast.success("Episodio guardado como borrador");}
    catch(cause){toast.error(cause instanceof Error?cause.message:"No se pudo actualizar el episodio.");}
  };
  const filters = [{key: "all", label: "Todos", count: episodes.length}, {key: "draft", label: "Borradores", count: episodes.filter(e => e.status === "draft").length}, {key: "published", label: "Publicados", count: episodes.filter(e => e.status === "published").length}] as const;
  const visible = episodes.filter(e => (filter === "all" || e.status === filter) && normalizeText(`${e.title} ${e.description} ${e.participants} ${e.format}`).includes(normalizeText(search)));
  return <Shell>
    <header className="acervo-heading"><div><h1>Podcast</h1><p>Conversaciones, historias y videos del patrimonio gastronómico de Puebla.</p></div><button className="acervo-primary" disabled={!loaded || !!error} onClick={addEpisode}><Plus className="size-4"/>Añadir episodio</button></header>
    {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm">{error}</p>}
    <section aria-label="Catálogo de episodios" className="acervo-card podcast-catalog mt-6 overflow-hidden">
      <div className="recipe-catalog-toolbar"><div className="recipe-catalog-filters" role="group" aria-label="Filtrar episodios por estado">{filters.map(f => <button key={f.key} className={`recipe-catalog-filter ${filter === f.key ? "is-active" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}<span className="recipe-catalog-count">{loaded ? f.count : "—"}</span></button>)}</div><div className="relative w-full sm:w-[320px]"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-[#8a97a9]"/><input className="acervo-input h-10 w-full !pl-10" aria-label="Buscar episodios" placeholder="Buscar episodio o participante…" value={search} onChange={e => setSearch(e.target.value)}/></div></div>
      {!loaded ? <p role="status" className="p-12 text-center text-sm text-[#8190a4]">Cargando episodios…</p> : !visible.length ? <div className="px-6 py-16 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#edf7fa] text-[#1684a5]"><Mic2 className="size-6"/></span><h2 className="mt-4 text-lg font-semibold">{episodes.length ? "No encontramos episodios" : "Tu próxima historia empieza aquí"}</h2><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-[#8190a4]">{episodes.length ? "Prueba otra búsqueda o cambia el estado seleccionado." : "Sube tu contenido a YouTube y añade el enlace para crear su ficha en el observatorio."}</p>{!episodes.length && !error && <button className="acervo-primary mt-5" onClick={addEpisode}><Plus className="size-4"/>Añadir primer episodio</button>}</div> : <div className="podcast-episode-list">{visible.map(episode=><EpisodeCard key={episode.id} episode={episode} onEdit={()=>{setEditing(episode);setOpen(true);}} onDraft={()=>moveToDraft(episode)} onDelete={()=>setPendingDelete(episode)}/>)}</div>}

    </section>
    <AlertDialog open={!!pendingDelete} onOpenChange={value=>{if(!value)setPendingDelete(null);}}><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>¿Eliminar episodio?</AlertDialogTitle><AlertDialogDescription>«{pendingDelete?.title}» dejará de aparecer en el catálogo del observatorio. El video seguirá disponible en YouTube.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><button type="button" onClick={confirmDelete} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[#c74454] px-4 text-sm font-medium text-white hover:bg-[#ad3544]"><Trash2 className="size-4"/>Eliminar episodio</button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <EpisodeForm key={open ? `form-${editing?.id??"new"}` : "closed"} open={open} onOpenChange={setOpen} initial={editing??blankEpisode()} recipes={recipes} ingredients={ingredients} onSaved={saved => {setEpisodes(readEpisodes()); setOpen(false); if(!editing)router.push(`/podcast/${saved.id}`);}}/>
  </Shell>;
}
export function PodcastDetail() {
  const {id} = useParams<{id: string}>();
  const {episodes, setEpisodes, recipes, ingredients, loaded, error} = usePodcastData();
  const [edit, setEdit] = useState(false);
  const episode = episodes.find(e => e.id === id);
  if (!loaded) return <Shell><p role="status">Cargando episodio…</p></Shell>;
  if (error || !episode) return <Shell><Link href="/podcast" className="acervo-secondary"><ArrowLeft className="size-4"/>Volver a Podcast</Link><p role="alert" className="mt-8">{error || "No encontramos este episodio."}</p></Shell>;
  return <Shell>
    <Link href="/podcast" className="mb-6 inline-flex items-center gap-2 text-xs text-[#718097]"><ArrowLeft className="size-4"/>Volver a Podcast</Link>
    <header className="acervo-heading"><div><div className="mb-3 flex items-center gap-3"><Status status={episode.status}/><span className="text-xs text-[#8190a4]">{episode.format === "podcast" ? "Podcast" : "Video"}</span></div><h1>{episode.title}</h1>{episode.date && <p>{new Intl.DateTimeFormat("es-MX", {dateStyle:"long"}).format(new Date(`${episode.date}T12:00:00`))}</p>}</div><button className="acervo-primary" onClick={() => setEdit(true)}><Pencil className="size-4"/>Editar episodio</button></header>
    <div className="podcast-detail mt-6"><section className="acervo-card overflow-hidden"><iframe className="aspect-video w-full border-0" src={`https://www.youtube-nocookie.com/embed/${episode.youtubeId}`} title={`Reproducir ${episode.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/><div className="p-6"><h2 className="text-sm font-semibold">Sobre este episodio</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#718097]">{episode.description || "Todavía no se ha añadido una descripción."}</p><a className="mt-6 inline-flex items-center gap-2 text-xs text-[#1684a5]" href={`https://www.youtube.com/watch?v=${episode.youtubeId}`} target="_blank" rel="noopener noreferrer">Ver en YouTube<ExternalLink className="size-3.5"/></a><p className="mt-3 text-[11px] leading-5 text-[#8190a4]">Si el video no está disponible o no permite reproducción aquí, ábrelo en YouTube.</p></div></section><aside className="acervo-card self-start p-6"><h2 className="text-sm font-semibold">En este episodio</h2><h3 className="mb-2 mt-5 text-xs text-[#8190a4]">Participantes</h3><p className="whitespace-pre-wrap text-sm leading-6">{episode.participants || "Sin participantes registrados"}</p>{episode.municipality && <><h3 className="mb-2 mt-5 text-xs text-[#8190a4]">Municipio</h3><p className="text-sm">{episode.municipality}</p></>}{[{title:"Recetas relacionadas", items: recipes.filter(r => episode.recipeIds.includes(r.id)), base:"recetas"}, {title:"Ingredientes relacionados", items: ingredients.filter(i => episode.ingredientIds.includes(i.id)), base:"ingredientes"}].map(group => group.items.length > 0 && <div key={group.base}><h3 className="mb-2 mt-5 text-xs text-[#8190a4]">{group.title}</h3>{group.items.map(item => <Link key={item.id} href={`/${group.base}/${item.id}`} className="mt-2 flex items-center justify-between gap-2 text-xs text-[#1684a5]">{item.name}<ArrowRight className="size-3.5"/></Link>)}</div>)}</aside></div>
    <EpisodeForm key={edit ? episode.updatedAt : "closed"} open={edit} onOpenChange={setEdit} initial={episode} recipes={recipes} ingredients={ingredients} onSaved={() => {setEpisodes(readEpisodes()); setEdit(false);}}/>
  </Shell>;
}
function Field({label, id, children}: {label:string; id:string; children:ReactNode}) {
  return <div><label className="acervo-label" htmlFor={id}>{label}</label>{children}</div>;
}
function EpisodeForm({open, onOpenChange, initial, recipes, ingredients, onSaved}: {open:boolean; onOpenChange:(open:boolean)=>void; initial:Episode; recipes:Related[]; ingredients:Related[]; onSaved:(episode:Episode)=>void}) {
  const [form, setForm] = useState(initial);
  const user=useSessionUser();
  const canPublish=user?.role==="administrador"||user?.role==="revisor";
  const [busy,setBusy]=useState(false);
  const [url, setUrl] = useState(initial.youtubeId ? `https://www.youtube.com/watch?v=${initial.youtubeId}` : "");
  const [error, setError] = useState("");
  const videoId = youtubeVideoId(url);
  const update = <K extends keyof Episode>(key:K, value:Episode[K]) => setForm(current => ({...current, [key]:value}));
  const submit = async(status:Episode["status"]) => {
    if(busy)return;
    if (!videoId) {setError("Pega un enlace válido a un video de YouTube; las listas de reproducción no identifican un episodio."); return;}
    if (!form.title.trim()) {setError("Escribe un título para el episodio."); return;}
    if (status === "published" && !form.description.trim()) {setError("Añade una descripción antes de publicar el episodio."); return;}
    setBusy(true);
    try {const saved = await saveEpisode({...form, title:form.title.trim(), youtubeId:videoId, status}); onSaved(saved); toast.success(status === "published" ? "Episodio publicado" : "Borrador guardado");}
    catch (cause) {setError(cause instanceof Error ? cause.message : "No se pudo guardar el episodio.");}
    finally{setBusy(false)}
  };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="recipe-create-dialog max-h-[90dvh] overflow-y-auto rounded-[24px] bg-white p-6 sm:max-w-[720px] sm:p-8"><DialogHeader className="text-left"><DialogTitle className="text-2xl text-[#173257]">{initial.id ? "Editar episodio" : "Añadir episodio"}</DialogTitle><DialogDescription>Vincula un video de YouTube y completa su ficha en el observatorio.</DialogDescription></DialogHeader><form className="mt-4 space-y-5" onSubmit={e => {e.preventDefault(); submit(canPublish?"published":"draft");}}>
    <Field label="Enlace de YouTube *" id="podcast-url"><input id="podcast-url" required type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className="acervo-input w-full"/><p className="mt-2 text-[11px] leading-5 text-[#8190a4]">Sube primero el contenido a YouTube. Para reproducirlo aquí, permite su inserción y usa un video público o no listado.</p>{url && <p className={`mt-2 text-xs ${videoId ? "text-[#1684a5]" : "text-[#b65765]"}`}>{videoId ? "Enlace reconocido. Comprueba la disponibilidad en la vista previa." : "Introduce el enlace de un video, Short o transmisión de YouTube."}</p>}</Field>
    {videoId && <iframe className="aspect-video w-full rounded-xl border-0" src={`https://www.youtube-nocookie.com/embed/${videoId}`} title="Vista previa del episodio" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>}
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Título del episodio *" id="podcast-title"><input id="podcast-title" required maxLength={200} value={form.title} onChange={e => update("title",e.target.value)} className="acervo-input w-full" placeholder="Ej. Los saberes detrás del mole"/></Field><Field label="Formato" id="podcast-format"><select id="podcast-format" value={form.format} onChange={e => update("format", e.target.value as Episode["format"])} className="acervo-input w-full"><option value="podcast">Podcast</option><option value="video">Video</option></select></Field></div>
    <Field label="Descripción" id="podcast-description"><textarea id="podcast-description" rows={4} value={form.description} onChange={e => update("description",e.target.value)} className="acervo-input w-full" placeholder="¿Qué historia, preparación o saber se comparte?"/></Field>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Participantes" id="podcast-participants"><input id="podcast-participants" value={form.participants} onChange={e => update("participants",e.target.value)} placeholder="Nombres de las personas participantes" className="acervo-input w-full"/></Field><Field label="Fecha del episodio" id="podcast-date"><input id="podcast-date" type="date" value={form.date} onChange={e => update("date",e.target.value)} className="acervo-input w-full"/></Field></div>
    <Field label="Municipio relacionado (opcional)" id="podcast-municipality"><MunicipalityField id="podcast-municipality" value={form.municipalityCode} onChange={item => setForm(current => ({...current, municipality:item?.name ?? "", municipalityCode:item?.code ?? ""}))}/></Field>
    <div className="grid gap-5 sm:grid-cols-2">{[{label:"Recetas relacionadas", items:recipes, key:"recipeIds" as const}, {label:"Ingredientes relacionados",items:ingredients,key:"ingredientIds" as const}].map(group => <fieldset key={group.key}><legend className="acervo-label">{group.label}</legend><div className="max-h-36 space-y-2 overflow-y-auto rounded-xl border border-[#e5eaf0] p-3">{group.items.length ? group.items.map(item => <label key={item.id} className="flex items-start gap-2 text-xs leading-5 text-[#627187]"><input type="checkbox" className="mt-1 accent-[#1684a5]" checked={form[group.key].includes(item.id)} onChange={e => update(group.key,e.target.checked ? [...form[group.key],item.id] : form[group.key].filter(id => id !== item.id))}/>{item.name}</label>) : <p className="text-xs text-[#8190a4]">No hay registros disponibles.</p>}</div></fieldset>)}</div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-5"><button type="button" className="acervo-secondary mr-auto" onClick={() => onOpenChange(false)}>Cancelar</button><button type="button" disabled={busy} className="acervo-secondary" onClick={() => submit("draft")}>{initial.status === "published" ? "Pasar a borrador" : "Guardar borrador"}</button><button type="submit" disabled={busy} className="acervo-primary">{busy?"Guardando…":!canPublish?"Guardar borrador":initial.status === "published" ? "Guardar cambios" : "Publicar episodio"}</button></div>
  </form></DialogContent></Dialog>;
}
