import { getSessionUser } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/sonner";
import { RecipesManager } from "@/modules/recipes/recipes-manager";
import { PublicCatalog } from "@/modules/public/catalog";

export default async function Page() {
  if (!await getSessionUser()) return <PublicCatalog resource="recipes"/>;
  return <><RecipesManager/><Toaster position="bottom-right" richColors/></>;
}
