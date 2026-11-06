import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import DemoAdmin from "@/src/legacy-pages/DemoAdmin.jsx";

export default function Page() {
  return <SectionShell activeItem="Mercados y tianguis" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <DemoAdmin resource="mercados" />
    </Suspense>
  </SectionShell>;
}
