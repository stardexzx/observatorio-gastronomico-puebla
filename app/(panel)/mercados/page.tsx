import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import Mercados from "@/src/legacy-pages/Mercados.jsx";

export default function Page() {
  return <SectionShell activeItem="Mercados y tianguis" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <Mercados />
    </Suspense>
  </SectionShell>;
}
