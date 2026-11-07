import { requireSessionUser } from "@/lib/auth/session";
import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import FichaPublica from "@/src/legacy-pages/FichaPublica.jsx";

export default async function Page() {
  await requireSessionUser();
  return <SectionShell activeItem="Acervo" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <FichaPublica />
    </Suspense>
  </SectionShell>;
}
