import { requireSessionUser } from "@/lib/auth/session";
import { LegalEditLoader } from "@/modules/legal/legal-detail";
import { LegalFrame } from "@/modules/legal/legal-frame";

export default async function Page({params}:{params:Promise<{id:string}>}) {
  await requireSessionUser();
  const {id}=await params;
  return <LegalFrame><LegalEditLoader id={id}/></LegalFrame>;
}
