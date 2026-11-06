import { SectionShell } from "@/components/integration/section-shell";
import { LegacyRecords } from "@/modules/integration/legacy-records";

export default function IntegrationPage() {
  return <SectionShell activeItem="Registros anteriores"><LegacyRecords /></SectionShell>;
}
