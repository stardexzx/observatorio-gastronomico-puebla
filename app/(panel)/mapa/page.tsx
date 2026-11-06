import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import MapaMunicipal from "@/src/legacy-pages/MapaMunicipal.jsx";

export default function Page() {
  return <SectionShell activeItem="Mapa" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <MapaMunicipal />
    </Suspense>
  </SectionShell>;
}
