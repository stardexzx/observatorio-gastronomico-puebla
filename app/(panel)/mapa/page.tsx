import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import { PublicMap } from "@/modules/public/public-map";
import MapaMunicipal from "@/src/legacy-pages/MapaMunicipal.jsx";
import { getSessionUser } from "@/lib/auth/session";

export default async function Page() {
  const user = await getSessionUser();
  return <SectionShell activeItem="Mapa" legacy={Boolean(user)}>
    <Suspense fallback={<p role="status">Cargando mapa…</p>}>
      {user ? <MapaMunicipal /> : <PublicMap />}
    </Suspense>
  </SectionShell>;
}
