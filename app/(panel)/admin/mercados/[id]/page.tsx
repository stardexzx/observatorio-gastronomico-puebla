import { Suspense } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import DemoRecordEditor from "@/src/legacy-pages/DemoRecordEditor.jsx";

export default function Page() {
  return <SectionShell activeItem="Mercados y tianguis" legacy>
    <Suspense fallback={<p role="status">Cargando sección…</p>}>
      <DemoRecordEditor resource="mercados" />
    </Suspense>
  </SectionShell>;
}
