import { getSessionUser } from "@/lib/auth/session";
import { LegalCatalog } from "@/modules/legal/legal-catalog";
import { LegalFrame } from "@/modules/legal/legal-frame";

export default async function Page() {
  const user=await getSessionUser();
  return <LegalFrame><LegalCatalog publicView={!user} canCreate={user?.role==="administrador"||user?.role==="capturista"}/></LegalFrame>;
}
