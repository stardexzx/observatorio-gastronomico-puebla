import { getSessionUser } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/sonner";
import { RecipeEditor } from "@/modules/recipes/recipe-editor";
import { PublicDetail } from "@/modules/public/catalog";

export default async function Page({params}:{params:Promise<{id:string}>}) {
  if (!await getSessionUser()) return <PublicDetail resource="recipes" id={(await params).id}/>;
  return <><RecipeEditor/><Toaster position="bottom-right" richColors/></>;
}
