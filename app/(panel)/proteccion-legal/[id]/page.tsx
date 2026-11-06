import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import DeclaratoriaDetalle from "@/src/legacy-pages/DeclaratoriaDetalle.jsx";

export default function Page() {
  return <SectionShell activeItem="Protección legal" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <DeclaratoriaDetalle />
    </Suspense>
  </SectionShell>;
}
