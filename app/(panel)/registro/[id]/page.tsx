import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import FichaPublica from "@/src/legacy-pages/FichaPublica.jsx";

export default function Page() {
  return <SectionShell activeItem="Acervo" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <FichaPublica />
    </Suspense>
  </SectionShell>;
}
