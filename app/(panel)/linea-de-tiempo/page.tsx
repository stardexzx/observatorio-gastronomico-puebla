import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import LineaDeTiempo from "@/src/legacy-pages/LineaDeTiempo.jsx";

export default function Page() {
  return (
    <SectionShell activeItem="Línea de tiempo">
      <Suspense fallback={<p role="status">Cargando línea de tiempo…</p>}>
        <LineaDeTiempo />
      </Suspense>
    </SectionShell>
  );
}
