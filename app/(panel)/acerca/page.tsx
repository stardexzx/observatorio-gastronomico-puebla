import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import AcercaDe from "@/src/legacy-pages/AcercaDe.jsx";

export default function Page() {
  return <SectionShell activeItem="Acerca del Observatorio" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <AcercaDe />
    </Suspense>
  </SectionShell>;
}
