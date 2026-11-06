"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ObservatorySidebar } from "@/components/dashboard/observatory-sidebar";
import { recipeStatusLabels, type RecipeRecord } from "@/data/recipes";
import { loadRecipes, deleteRecipe, createRecipe as saveNewRecipe } from "@/data/recipe-storage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { NewRecipeDialog } from "./new-recipe-dialog";
import { normalizeText } from "./recipe-form-controls";

type Filter = "all" | "draft" | "in-review" | "verified";
export function RecipesManager() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [newOpen, setNewOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RecipeRecord|null>(null);
  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await deleteRecipe(pendingDelete.id);
      setRecipes(current=>current.filter(item=>item.id!==pendingDelete.id));
      setPendingDelete(null);
      toast.success("Receta eliminada");
    } catch (error) {
      toast.error(error instanceof Error?error.message:"No se pudo eliminar la receta");
    } finally { setDeleting(false); }
  };
  useEffect(() => { let cancelled=false; loadRecipes().then(items => {if(!cancelled)setRecipes(items);}).catch(error => {if(!cancelled)setError(error.message);}).finally(() => {if(!cancelled)setLoading(false);}); return()=>{cancelled=true;}; }, []);
  const filtered = useMemo(() => recipes.filter(recipe => (filter === "all" || (filter === "verified" ? ["verified","published"].includes(recipe.status) : recipe.status === filter)) && normalizeText(`${recipe.name} ${recipe.municipality} ${recipe.region} ${recipe.category}`).includes(normalizeText(search))), [recipes,search,filter]);
  const summaries = [
    {key:"all",label:"Todas",value:recipes.length},
    {key:"draft",label:"Borradores",value:recipes.filter(item=>item.status==="draft").length},
    {key:"in-review",label:"En revisión",value:recipes.filter(item=>item.status==="in-review").length},
    {key:"verified",label:"Verificadas",value:recipes.filter(item=>["verified","published"].includes(item.status)).length},
  ] as const;
  const createRecipe = async (record:RecipeRecord) => {
    if(creating)return;
    setCreating(true);
    try { const recipe=await saveNewRecipe(record); setNewOpen(false); toast.success("Borrador creado"); router.push(`/recetas/${recipe.id}`); }
    catch(error) {toast.error(error instanceof Error?error.message:"No se pudo guardar la receta");}
    finally {setCreating(false);}
  };
  return <div className="acervo-page min-h-screen text-[#173257]">
    <ObservatorySidebar activeItem="Recetas"/>
    <main className="admin-main"><div className="mx-auto max-w-[1360px]">
      <header className="acervo-heading"><div><h1>Recetas</h1><p>Documenta las preparaciones y los saberes gastronómicos de Puebla.</p></div><div className="flex items-center gap-3"><Link href="/recetario" className="acervo-secondary"><BookOpen className="size-4"/>Leer recetario</Link><button className="acervo-primary" onClick={()=>setNewOpen(true)} disabled={loading||!!error||creating}><Plus className="size-4"/>Nueva receta</button></div></header>
      {error && <div role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm">{error} <button onClick={()=>window.location.reload()} className="underline">Reintentar</button></div>}
      <section aria-label="Catálogo de recetas" className="acervo-card mt-6 overflow-hidden">
        <div className="recipe-catalog-toolbar">
          <div role="group" aria-label="Filtrar recetas por estado" className="recipe-catalog-filters">{summaries.map(({key,label,value})=><button key={key} type="button" onClick={()=>setFilter(key)} aria-pressed={filter===key} className={`recipe-catalog-filter ${filter===key?"is-active":""}`}><span>{label}</span><span className="recipe-catalog-count">{loading?"—":value}</span></button>)}</div>
          <div className="relative w-full sm:w-[320px]"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 size-4 text-[#8a97a9]"/><input aria-label="Buscar recetas" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar receta, municipio o región…" className="acervo-input h-10 w-full pl-10"/></div>
          {search.trim()&&!loading&&<p role="status" className="w-full text-[11px] text-[#8190a4]">{filtered.length} {filtered.length===1?"resultado":"resultados"} para «{search.trim()}»</p>}
        </div>
        <div className="overflow-x-auto"><table className="recipe-table"><thead><tr><th>Receta</th><th>Municipio</th><th>Estado</th><th>Completitud</th><th>Actualización</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{filtered.map(recipe => <tr key={recipe.id}><td><Link href={`/recetas/${recipe.id}`} className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#edf7fa] text-[#1684a5]"><BookOpen className="size-[18px]"/></span><span><strong className="block text-[12px] font-medium">{recipe.name}</strong><small className="mt-1 block text-[10px] text-[#8a97a9]">{recipe.category||"Sin categoría"} · {recipe.region}</small></span></Link></td><td>{recipe.municipality}</td><td><span className={`recipe-status status-${recipe.status}`}>{recipeStatusLabels[recipe.status]}</span></td><td><div className="flex items-center gap-2"><span className="h-1.5 w-20 overflow-hidden rounded-full bg-[#edf1f5]"><span className="block h-full rounded-full bg-[#62b9ce]" style={{width:`${recipe.completeness}%`}}/></span><span className="text-[10px] text-[#8190a4]">{recipe.completeness}%</span></div></td><td className="text-[#8190a4]">{recipe.updatedAt}</td><td><div className="flex items-center justify-end gap-2"><Link href={`/recetas/${recipe.id}`} aria-label={`Abrir ${recipe.name}`} className="grid size-8 place-items-center rounded-lg border text-[#8190a4] hover:bg-[#edf7fa]"><ArrowRight className="size-3.5"/></Link><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Opciones de ${recipe.name}`} className="grid size-8 shrink-0 place-items-center rounded-lg border text-[#8190a4] hover:bg-[#edf7fa]"><MoreHorizontal className="size-4"/></button></DropdownMenuTrigger><DropdownMenuContent align="end" className="rounded-xl p-1.5"><DropdownMenuItem onSelect={()=>setPendingDelete(recipe)} className="cursor-pointer gap-2 rounded-lg text-[#c74454] focus:bg-red-50 focus:text-[#ad3544]"><Trash2 className="size-4"/>Eliminar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td></tr>)}</tbody></table></div>
        {loading && <p role="status" className="p-10 text-center text-sm text-[#8190a4]">Cargando recetas…</p>}
        {!loading&&!filtered.length&&<div className="p-12 text-center"><BookOpen className="mx-auto size-8 text-[#b9c8d5]"/><p className="mt-3 text-sm text-[#8190a4]">No encontramos recetas con esos filtros.</p><button onClick={()=>{setSearch("");setFilter("all");}} className="mt-3 text-xs text-[#1684a5]">Ver todas las recetas</button></div>}
      </section>
    </div></main>
    <NewRecipeDialog key={newOpen?"open":"closed"} open={newOpen} busy={creating} recipes={recipes} onOpenChange={setNewOpen} onOpenExisting={recipe=>{setNewOpen(false);router.push(`/recetas/${recipe.id}`);}} onCreate={createRecipe}/>
    <AlertDialog open={!!pendingDelete} onOpenChange={open=>{if(!open&&!deleting)setPendingDelete(null);}}><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle><AlertDialogDescription>«{pendingDelete?.name}» dejará de aparecer en el catálogo.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel><button type="button" disabled={deleting} onClick={confirmDelete} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[#c74454] px-4 text-sm font-medium text-white hover:bg-[#ad3544] disabled:opacity-50"><Trash2 className="size-4"/>{deleting?"Eliminando…":"Eliminar receta"}</button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
