import { getSessionUser } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/sonner";
import { CooksManager } from "@/modules/cooks/cooks-manager";
import { PublicCatalog } from "@/modules/public/catalog";

export default async function Page() {
  if (!await getSessionUser()) return <PublicCatalog resource="cooks"/>;
  return <><CooksManager/><Toaster position="bottom-right" richColors/></>;
}
