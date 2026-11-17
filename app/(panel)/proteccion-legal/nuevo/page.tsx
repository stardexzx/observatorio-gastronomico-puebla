import Link from "next/link";
import { requireSessionUser } from "@/lib/auth/session";
import { LegalEditor } from "@/modules/legal/legal-editor";
import { LegalFrame } from "@/modules/legal/legal-frame";

export default async function Page() {
  const user=await requireSessionUser();
  const canCreate=user.role==="administrador"||user.role==="capturista";
  return <LegalFrame>{canCreate?<LegalEditor canCreate/>:<section className="g-card legal-empty"><h1>Captura no disponible</h1><p>Tu cuenta puede consultar las fichas y realizar las acciones editoriales autorizadas.</p><Link className="g-btn" href="/proteccion-legal">Volver al catálogo</Link></section>}</LegalFrame>;
}
