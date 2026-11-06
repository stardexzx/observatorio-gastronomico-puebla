import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import MercadoDetalle from "@/src/legacy-pages/MercadoDetalle.jsx";

export default function Page() {
  return <SectionShell activeItem="Mercados y tianguis" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <MercadoDetalle />
    </Suspense>
  </SectionShell>;
}
