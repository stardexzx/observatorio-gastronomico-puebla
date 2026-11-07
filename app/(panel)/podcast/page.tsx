import { getSessionUser } from "@/lib/auth/session";
import { Toaster } from "@/components/ui/sonner";
import { PodcastManager } from "@/modules/podcast/podcast-manager";
import { PublicCatalog } from "@/modules/public/catalog";

export default async function Page() {
  if (!await getSessionUser()) return <PublicCatalog resource="episodes"/>;
  return <><PodcastManager/><Toaster position="bottom-right" richColors/></>;
}
