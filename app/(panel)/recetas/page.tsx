import { Toaster } from "@/components/ui/sonner";
import { RecipesManager } from "@/modules/recipes/recipes-manager";

export default function Page(){return <><RecipesManager/><Toaster position="bottom-right" richColors/></>}
