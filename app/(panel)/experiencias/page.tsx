import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import VistasPendientes from "@/src/legacy-pages/VistasPendientes.jsx";

export default function Page() {
  return <SectionShell activeItem="Experiencias de turistas" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <VistasPendientes title="Experiencias de turistas" description="Un espacio para documentar las experiencias de visitantes y su vínculo con el patrimonio gastronómico poblano." />
    </Suspense>
  </SectionShell>;
}
