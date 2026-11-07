import { getSessionUser } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/sonner";
import { PodcastDetail } from "@/modules/podcast/podcast-manager";
import { PublicDetail } from "@/modules/public/catalog";

export default async function Page({params}:{params:Promise<{id:string}>}) {
  if (!await getSessionUser()) return <PublicDetail resource="episodes" id={(await params).id}/>;
  return <><PodcastDetail/><Toaster position="bottom-right" richColors/></>;
}
