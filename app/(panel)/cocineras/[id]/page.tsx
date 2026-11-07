import { getSessionUser } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/sonner";
import { CookEditor } from "@/modules/cooks/cook-editor";
import { PublicDetail } from "@/modules/public/catalog";

export default async function Page({params}:{params:Promise<{id:string}>}) {
  if (!await getSessionUser()) return <PublicDetail resource="cooks" id={(await params).id}/>;
  return <><CookEditor/><Toaster position="bottom-right" richColors/></>;
}
