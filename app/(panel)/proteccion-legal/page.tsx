import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import ProteccionLegal from "@/src/legacy-pages/ProteccionLegal.jsx";

export default function Page() {
  return <SectionShell activeItem="Protección legal" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <ProteccionLegal />
    </Suspense>
  </SectionShell>;
}
