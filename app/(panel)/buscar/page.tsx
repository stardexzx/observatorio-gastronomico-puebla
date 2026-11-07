import { requireSessionUser } from "@/lib/auth/session";
import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import Buscar from "@/src/legacy-pages/Buscar.jsx";

export default async function Page() {
  await requireSessionUser();
  return <SectionShell activeItem="Búsqueda" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <Buscar />
    </Suspense>
  </SectionShell>;
}
