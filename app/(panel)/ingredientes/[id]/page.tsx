import { getSessionUser } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/sonner";
import { IngredientEditor } from "@/modules/ingredients/ingredient-editor";
import { PublicDetail } from "@/modules/public/catalog";

export default async function Page({params}:{params:Promise<{id:string}>}) {
  if (!await getSessionUser()) return <PublicDetail resource="ingredients" id={(await params).id}/>;
  return <><IngredientEditor/><Toaster position="bottom-right" richColors/></>;
}
