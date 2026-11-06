import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Observatorio Gastronómico de Puebla", description: "Panel local de análisis del patrimonio gastronómico de Puebla.", icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><body className="antialiased">{children}</body></html>; }
