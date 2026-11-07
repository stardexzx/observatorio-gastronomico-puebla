import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import { PublicMap } from "@/modules/public/public-map";

export default function Page() {
  return <SectionShell activeItem="Mapa">
    <Suspense fallback={<p role="status">Cargando mapa…</p>}>
      <PublicMap />
    </Suspense>
  </SectionShell>;
}
