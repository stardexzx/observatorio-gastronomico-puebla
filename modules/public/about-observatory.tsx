import Link from "next/link";
import { ArrowUpRight, BookOpen, History, MapPin, Network } from "lucide-react";

export function AboutObservatory() {
  return <>
    <header className="mb-7"><p className="section-kicker mb-2">Conocer el Observatorio</p><h1 className="text-[32px] font-semibold tracking-tight text-[#001B62]">Acerca del Observatorio</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#8190a4]">Una plataforma para documentar, conocer y contribuir a la preservación del patrimonio gastronómico de Puebla.</p></header>
    <div className="grid gap-5 md:grid-cols-2">
      <section className="rounded-xl border bg-white p-6"><span className="mb-5 grid size-11 place-items-center rounded-xl bg-[#edf7fa] text-[#1684a5]"><BookOpen className="size-5"/></span><h2 className="text-base font-semibold text-[#001B62]">Propósito</h2><p className="mt-3 text-sm leading-7 text-[#52647d]">El Observatorio Gastronómico de Puebla (OGP) reúne registros relacionados con recetas, mercados, ingredientes, cocineras y cocineros tradicionales y mecanismos de protección patrimonial.</p></section>
      <section className="rounded-xl border bg-white p-6"><span className="mb-5 grid size-11 place-items-center rounded-xl bg-[#edf7fa] text-[#1684a5]"><Network className="size-5"/></span><h2 className="text-base font-semibold text-[#001B62]">Conocimiento conectado</h2><p className="mt-3 text-sm leading-7 text-[#52647d]">Las fichas y relaciones permiten observar el patrimonio como una red viva de personas, territorios, productos, técnicas y memorias.</p></section>
    </div>
    <section className="mt-5 rounded-xl border bg-white p-6"><h2 className="text-base font-semibold text-[#001B62]">Explora el patrimonio gastronómico</h2><div className="mt-5 grid gap-3 sm:grid-cols-3">{[
      { href: "/recetas", title: "Acervo de recetas", description: "Preparaciones y saberes documentados.", icon: BookOpen },
      { href: "/memoria", title: "Memoria histórica", description: "Un recorrido por la gastronomía poblana.", icon: History },
      { href: "/mapa", title: "Mapa gastronómico", description: "Los registros y su vínculo con el territorio.", icon: MapPin },
    ].map(({ href, title, description, icon: Icon }) => <Link key={href} href={href} className="group flex items-start gap-3 rounded-xl border p-4 transition hover:border-[#a9d2ed] hover:bg-[#f3f9fc]"><Icon className="mt-0.5 size-4 shrink-0 text-[#1684a5]"/><span className="min-w-0 flex-1"><strong className="block text-xs font-semibold text-[#001B62]">{title}</strong><span className="mt-2 block text-xs leading-relaxed text-[#8190a4]">{description}</span></span><ArrowUpRight className="size-3.5 text-[#a1adbc]"/></Link>)}</div></section>
  </>;
}
