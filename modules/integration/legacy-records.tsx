"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSessionUser } from "@/components/auth/session-provider";
import { createRecipe } from "@/data/recipe-storage";
import { upsertCook } from "@/data/cook-storage";
import { loadAuthorCatalogs, mappingStorageKey, readLegacyMappings } from "@/lib/integration/catalogs";
import { normalizedName, type Catalogs } from "@/lib/integration/records";
import { legacyCookDraft, legacyRecipeDraft, planLegacyImport, preserveLegacyArchive, readLegacyArchive, type LegacyArchive } from "@/lib/integration/legacy-transfer";

const message = (error: unknown) => error instanceof Error ? error.message : "No se pudo completar la operación.";
type ImportResult = { key: string; name: string; text: string; to?: string };

export function LegacyRecords() {
  const user = useSessionUser();
  const [archive, setArchive] = useState<LegacyArchive | null>(null), [author, setAuthor] = useState<Catalogs | null>(null);
  const [error, setError] = useState(""), [catalogError, setCatalogError] = useState(""), [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]), [downloaded, setDownloaded] = useState(false), [results, setResults] = useState<ImportResult[]>([]);
  useEffect(() => {
    let live = true;
    readLegacyArchive().then((value) => { if (live) setArchive(value); }).catch((e) => { if (live) setError(message(e)); });
    loadAuthorCatalogs().then((value) => { if (live) setAuthor(value); }).catch((e) => { if (live) setCatalogError(message(e)); });
    return () => { live = false; };
  }, []);
  const preview = useMemo(() => archive && author ? planLegacyImport(archive, author) : [], [archive, author]);
  const eligible = preview.filter((r) => !r.duplicateId && !r.blocked.length && !results.some((x) => x.key === r.key && x.to));
  function download() {
    if (!archive) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `observatorio-registros-anteriores-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setDownloaded(true);
  }
  async function importSelected() {
    if (!archive || !selected.length || user?.role === "revisor") return;
    setBusy(true); setError("");
    const outcomes: ImportResult[] = [];
    try {
      // Recheck names immediately before the explicit write; the author's existing entry wins.
      const current = await loadAuthorCatalogs(), mappings = readLegacyMappings();
      const plan = planLegacyImport(archive, current).filter((r) => selected.includes(r.key));
      await preserveLegacyArchive(archive);
      window.localStorage.setItem(mappingStorageKey, JSON.stringify(mappings));
      for (const row of plan) {
        if (row.blocked.length) { outcomes.push({ key: row.key, name: row.name, text: row.blocked.join(". ") }); continue; }
        const duplicate = current[row.kind]?.find((r) => normalizedName(r.n) === normalizedName(row.name));
        if (duplicate) {
          mappings[row.key] = duplicate.id;
          window.localStorage.setItem(mappingStorageKey, JSON.stringify(mappings));
          outcomes.push({ key: row.key, name: row.name, text: "Ya existe: se conservó la ficha actual.", to: `/${row.kind}/${encodeURIComponent(duplicate.id)}` });
          continue;
        }
        try {
          const saved = row.kind === "recetas" ? await createRecipe(legacyRecipeDraft(row, archive)) : await upsertCook(legacyCookDraft(row, archive));
          mappings[row.key] = saved.id;
          window.localStorage.setItem(mappingStorageKey, JSON.stringify(mappings));
          current[row.kind] = [...(current[row.kind] || []), { id: saved.id, n: saved.name }];
          outcomes.push({ key: row.key, name: row.name, text: row.kind === "recetas" ? "Importada como borrador en recetas." : "Importada como borrador en el catálogo.", to: `/${row.kind}/${encodeURIComponent(saved.id)}` });
        } catch (e) {
          outcomes.push({ key: row.key, name: row.name, text: message(e) });
          // Stop after a failure so the user can inspect the completed records before retrying.
          break;
        }
        setResults([...outcomes]);
      }
      setResults(outcomes); setSelected([]); setAuthor(await loadAuthorCatalogs());
      window.dispatchEvent(new Event("ogp:demo-changed"));
    } catch (e) { setError(message(e)); setResults(outcomes); }
    finally { setBusy(false); }
  }
  return <div className="px-5 py-8 sm:px-8">
    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#8a6c38]">Continuidad del acervo</p>
    <h1 className="text-3xl font-bold">Registros anteriores</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Revisa y respalda lo que guardaste en la versión anterior desde este navegador. Las fichas del catálogo actual tienen prioridad cuando coincide el nombre. Los mercados y la protección legal conservan su almacenamiento local.</p>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {!archive && !error && <p className="mt-8" role="status">Leyendo registros anteriores…</p>}
    {archive && <>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Respaldo completo</h2>
        {archive.exists ? <>
          <p className="mt-2 text-sm text-slate-600">{archive.records.length} registros y {archive.drafts.length} borradores encontrados. El respaldo incluye las fichas, sus relaciones y los adjuntos locales. Guarda este archivo para conservar una copia independiente.</p>
          <button type="button" disabled={busy} onClick={download} className="mt-4 rounded-lg bg-[#173257] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Descargar respaldo JSON</button>
          {downloaded && <p className="mt-2 text-sm text-emerald-800" role="status">Respaldo preparado para descargar. Se conservará también una copia local antes de importar.</p>}
        </> : <p className="mt-2 text-sm text-slate-600">Este navegador no contiene una colección de la versión anterior. Abre esta pantalla en el navegador y la dirección donde guardaste tus registros.</p>}
      </section>
      {archive.exists && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Pasar fichas al catálogo actual</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Selecciona únicamente las fichas que deseas trasladar. Las recetas se guardan como borradores con tu sesión; las personas se guardan como borradores en el catálogo. Las fuentes y los campos que falten quedan pendientes de completar. Los datos de muestra del demo anterior se excluyen.</p>
        {catalogError && <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Puedes descargar el respaldo. Para comparar e importar, primero debe estar disponible el catálogo actual: {catalogError}</p>}
        {!author && !catalogError && <p className="mt-4 text-sm" role="status">Comparando con los catálogos actuales…</p>}
        {author && preview.length === 0 && <p className="mt-4 text-sm text-slate-600">No hay recetas ni personas capturadas por ti para trasladar. Los mercados, la protección legal y los borradores permanecen disponibles en el respaldo.</p>}
        {preview.length > 0 && <>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <button type="button" disabled={busy || user?.role === "revisor"} onClick={() => setSelected(eligible.map((r) => r.key))} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-50">Seleccionar disponibles ({eligible.length})</button>
            <button type="button" disabled={busy} onClick={() => setSelected([])} className="px-2 py-2 text-slate-600">Limpiar selección</button>
            <span>{selected.length} seleccionadas</span>
          </div>
          <ul className="mt-4 divide-y divide-slate-200">
            {preview.map((row) => <li key={row.key} className="py-4">
              <label className="flex gap-3"><input type="checkbox" className="mt-1 size-4" checked={selected.includes(row.key)} disabled={busy || !!row.duplicateId || !!row.blocked.length || user?.role === "revisor" || results.some((r) => r.key === row.key && !!r.to)} onChange={(event) => setSelected((old) => event.target.checked ? [...old, row.key] : old.filter((key) => key !== row.key))} /><span><strong className="block text-sm">{row.name || "Sin nombre"}</strong><span className="text-xs text-slate-500">{row.kind === "recetas" ? "Receta" : "Cocinera o cocinero"} · {row.record.m || row.record.p || "Municipio pendiente"}</span></span></label>
              <div className="ml-7 mt-2 text-sm">
                {row.duplicateId && <p className="text-emerald-800">Ya existe: se conserva la ficha actual. <Link className="underline" href={`/${row.kind}/${encodeURIComponent(row.duplicateId)}`}>Ver ficha</Link></p>}
                {row.blocked.map((reason) => <p key={reason} className="text-amber-800">{reason}. Corrige la ficha anterior antes de trasladarla.</p>)}
                <details className="mt-2 text-slate-600"><summary className="cursor-pointer">Ver información que se trasladará</summary><p className="mt-2 whitespace-pre-wrap">{row.record.d || row.record.bio || "Descripción pendiente de completar."}</p><ul className="mt-2 list-disc pl-5">{row.missing.map((item) => <li key={item}>{item}</li>)}<li>El respaldo conserva todos los campos anteriores y sus relaciones.</li></ul></details>
              </div>
            </li>)}
          </ul>
          {user?.role === "revisor" && <p className="mt-4 text-sm text-amber-900">Tu cuenta de revisión permite consultar y respaldar. La importación requiere una cuenta con permiso de captura.</p>}
          {!downloaded && <p className="mt-4 text-sm text-slate-600">Puedes descargar el respaldo completo antes de importar. Los registros originales se conservarán.</p>}
          <button type="button" onClick={importSelected} disabled={busy || !selected.length || user?.role === "revisor"} className="mt-4 rounded-lg bg-[#173257] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Importando…" : `Importar selección (${selected.length})`}</button>
        </>}
        {!!results.length && <div role="status" className="mt-5 rounded-xl bg-slate-50 p-4"><h3 className="font-semibold">Resultado de la importación</h3><ul className="mt-3 space-y-2 text-sm">{results.map((r) => <li key={r.key}><strong>{r.name}:</strong> {r.text} {r.to && <Link className="underline" href={r.to}>Abrir ficha</Link>}</li>)}</ul></div>}
      </section>}
    </>}
  </div>;
}
