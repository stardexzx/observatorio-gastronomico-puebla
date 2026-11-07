import { SectionShell } from "@/components/integration/section-shell";
import { LegacyRecords } from "@/modules/integration/legacy-records";
import { requireSessionUser } from "@/lib/auth/session";

export default async function IntegrationPage() {
  await requireSessionUser();
  return <SectionShell activeItem="Registros anteriores"><LegacyRecords /></SectionShell>;
}
