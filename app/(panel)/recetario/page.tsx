import { join } from 'node:path';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { RecipeBookReader } from '@/modules/reader/recipe-book-reader';
import { SectionShell } from '@/components/integration/section-shell';
import { recipeBooks } from '@/data/recipe-books';
import { inspectRecipeBookFiles } from '@/lib/recipe-book-files';

export const metadata={title:'Recetario · Observatorio Gastronómico de Puebla'};
export default async function Page(){
  const catalog = await inspectRecipeBookFiles(recipeBooks,join(process.cwd(),'assets','recetarios'));
  const available = catalog.filter(book=>book.available);
  if(available.length) return <RecipeBookReader books={available}/>;
  return <SectionShell activeItem="Recetario"><div className="py-8">
    <p className="section-kicker">Biblioteca gastronómica</p><h1 className="editorial-title mt-2 text-3xl font-bold">Recetario</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Explora las publicaciones sobre la cocina de Puebla. Podrás leer cada recetario aquí cuando esté disponible.</p>
    <div className="mt-6 grid gap-4 md:grid-cols-2">{catalog.map(book=><article key={book.id} className="rounded-2xl border border-slate-200 bg-white p-6">
      <BookOpen className="mb-4 size-8 text-[#173257]" aria-hidden="true"/><h2 className="text-lg font-semibold">{book.title}</h2><p className="mt-1 text-sm text-slate-500">{book.subtitle}</p><p className="mt-4 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">Próximamente</p>
    </article>)}</div><Link href="/recetas" className="mt-6 inline-block text-sm font-semibold text-[#173257] underline underline-offset-4">Consultar las recetas del Observatorio →</Link>
  </div></SectionShell>;
}
