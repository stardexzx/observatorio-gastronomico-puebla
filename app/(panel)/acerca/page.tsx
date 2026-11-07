import { SectionShell } from "@/components/integration/section-shell";
import { AboutObservatory } from "@/modules/public/about-observatory";

export default function Page() {
  return <SectionShell activeItem="Acerca del Observatorio"><AboutObservatory/></SectionShell>;
}
