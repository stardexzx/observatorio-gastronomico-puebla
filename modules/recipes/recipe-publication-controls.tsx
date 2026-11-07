"use client";

import { useEffect, useState } from "react";
import { Globe2, RefreshCw, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useSessionUser } from "@/components/auth/session-provider";

export type RecipePublicationState = { published: boolean; publishedAt: string | null };

export function RecipePublicationControls({ id, disabled = false, onPublicationChange }: { id: string; disabled?: boolean; onPublicationChange?: (publication: RecipePublicationState) => void }) {
  const user = useSessionUser();
  const canPublish = user?.role === "administrador" || user?.role === "revisor";
  const [publication, setPublication] = useState<RecipePublicationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endpoint = `/api/catalogs/recipes/${encodeURIComponent(id)}/publication`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const body = await response.json() as Partial<RecipePublicationState> & { error?: string };
        if (!response.ok) throw new Error(body.error || "No se pudo consultar la publicación.");
        if (typeof body.published !== "boolean") throw new Error("No se pudo consultar la publicación.");
        if (!controller.signal.aborted) {
          const confirmed = { published: body.published, publishedAt: body.publishedAt ?? null };
          setPublication(confirmed);
          onPublicationChange?.(confirmed);
          setError("");
        }
      })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "No se pudo consultar la publicación."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, onPublicationChange]);

  const changePublication = async (action: "publish" | "unpublish") => {
    if (!canPublish || busy || disabled) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      const body = await response.json() as Partial<RecipePublicationState> & { error?: string };
      if (!response.ok) throw new Error(body.error || "No se pudo cambiar la publicación.");
      if (typeof body.published !== "boolean") throw new Error("No se pudo confirmar la publicación. Vuelve a cargar la ficha.");
      const confirmed = { published: body.published, publishedAt: body.publishedAt ?? null };
      setPublication(confirmed);
      onPublicationChange?.(confirmed);
      toast.success(body.published ? "Receta publicada para los usuarios" : "Publicación retirada");
    } catch (error) {
      setError(error instanceof Error ? error.message : "No se pudo cambiar la publicación.");
    } finally { setBusy(false); }
  };

  return <section aria-label="Publicación de la receta" className="mt-5 rounded-xl border border-[#dce8f2] bg-white px-4 py-3">
    <div className="flex flex-wrap items-center gap-3">
      <Globe2 aria-hidden="true" className="size-4 shrink-0 text-[#033AA5]" />
      <div className="min-w-0 flex-1 text-xs">
        <p className="font-medium" role="status">{loading ? "Consultando publicación…" : publication?.published ? "Visible para los usuarios" : error ? "Publicación sin confirmar" : "Sin publicar"}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#8190a4]">{publication?.published ? "Los usuarios consultan la última versión publicada. Publica de nuevo para actualizarla." : "La ficha será visible cuando el equipo la revise y publique."}</p>
      </div>
      {canPublish && <div className="flex flex-wrap gap-2">
        {publication?.published && <button type="button" className="acervo-secondary" disabled={loading || busy || disabled} onClick={() => void changePublication("unpublish")}><EyeOff className="size-3.5" />Retirar publicación</button>}
        <button type="button" className="acervo-primary" disabled={loading || busy || disabled} onClick={() => void changePublication("publish")}>
          {publication?.published ? <RefreshCw className="size-3.5" /> : <Globe2 className="size-3.5" />}
          {busy ? "Procesando…" : publication?.published ? "Actualizar publicación" : "Publicar receta"}
        </button>
      </div>}
    </div>
    {canPublish && disabled && <p className="mt-2 text-[11px] text-[#8190a4]">Espera a que se guarden los cambios para publicar.</p>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
  </section>;
}
