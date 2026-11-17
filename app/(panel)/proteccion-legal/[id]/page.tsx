import { getSessionUser } from "@/lib/auth/session";
import { LegalDetail } from "@/modules/legal/legal-detail";
import { LegalFrame } from "@/modules/legal/legal-frame";

export default async function Page({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const user=await getSessionUser();
  return <LegalFrame><LegalDetail id={id} publicView={!user}/></LegalFrame>;
}
