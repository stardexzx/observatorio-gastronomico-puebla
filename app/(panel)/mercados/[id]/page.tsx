import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth/session";
import { PublicMarkets } from "@/modules/public/catalog";
import { SectionShell } from "@/components/integration/section-shell";
import MercadoDetalle from "@/src/legacy-pages/MercadoDetalle.jsx";

export default async function Page() {
  if (!await getSessionUser()) return <PublicMarkets/>;
  return <SectionShell activeItem="Mercados y tianguis" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <MercadoDetalle />
    </Suspense>
  </SectionShell>;
}
