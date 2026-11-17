import type { ReactNode } from "react";
import { SectionShell } from "@/components/integration/section-shell";
import "./legal.css";

export function LegalFrame({children}:{children:ReactNode}) {
  return <SectionShell activeItem="Protección legal" legacy><div className="legal-module">{children}</div></SectionShell>;
}
