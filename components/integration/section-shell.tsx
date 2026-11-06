import type { ReactNode } from "react";
import { ObservatorySidebar } from "@/components/dashboard/observatory-sidebar";
import { IconSprite } from "@/src/assets/icons.jsx";
import "@/src/styles/legacy-theme.css";

export function SectionShell({
  activeItem,
  children,
  legacy = false,
}: {
  activeItem: string;
  children: ReactNode;
  legacy?: boolean;
}) {
  return <div className="min-h-screen bg-[#f5f7f6] text-[#173257]">
    <ObservatorySidebar activeItem={activeItem} />
    <main className="admin-main min-h-screen">
      <div className={`mx-auto max-w-[1320px]${legacy ? " legacy-module" : ""}`}>
        <IconSprite />
        {children}
      </div>
    </main>
  </div>;
}
