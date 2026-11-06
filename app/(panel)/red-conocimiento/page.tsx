import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import RedConocimiento from "@/src/legacy-pages/RedConocimiento.jsx";

export default function Page() {
  return <SectionShell activeItem="Red de conocimiento" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <RedConocimiento />
    </Suspense>
  </SectionShell>;
}
