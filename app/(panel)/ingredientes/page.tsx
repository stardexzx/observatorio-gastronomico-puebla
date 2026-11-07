import { getSessionUser } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/sonner";
import { IngredientsManager } from "@/modules/ingredients/ingredients-manager";
import { PublicCatalog } from "@/modules/public/catalog";

export default async function Page() {
  if (!await getSessionUser()) return <PublicCatalog resource="ingredients"/>;
  return <><IngredientsManager/><Toaster position="bottom-right" richColors/></>;
}
