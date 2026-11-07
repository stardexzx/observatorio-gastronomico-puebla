import Link from "next/link";
import { ArrowUpRight, History, Info } from "lucide-react";
import { SectionShell } from "@/components/integration/section-shell";

export default function Page() {
  return <SectionShell activeItem="Conocer el observatorio"><header className="mb-7"><p className="section-kicker mb-2">Historia y propósito</p><h1 className="text-[32px] font-semibold tracking-tight text-[#001B62]">Conocer el Observatorio</h1><p className="mt-2 text-sm text-[#8190a4]">Descubre nuestra historia gastronómica y el propósito del Observatorio.</p></header><div className="grid gap-5 md:grid-cols-2">{[
    { href: "/memoria", title: "Memoria histórica", description: "Recorre de forma interactiva los ingredientes, encuentros y saberes de la gastronomía poblana.", icon: History },
    { href: "/acerca", title: "Acerca del Observatorio", description: "Conoce el propósito de esta plataforma y explora las conexiones del patrimonio gastronómico.", icon: Info },
  ].map(({ href, title, description, icon: Icon }) => <Link href={href} key={href} className="group rounded-xl border bg-white p-7 transition hover:border-[#a9d2ed] hover:shadow-sm"><span className="mb-6 flex items-center justify-between"><span className="grid size-12 place-items-center rounded-xl bg-[#edf7fa] text-[#1684a5]"><Icon className="size-6"/></span><ArrowUpRight className="size-5 text-[#a1adbc] group-hover:text-[#1684a5]"/></span><h2 className="text-lg font-semibold text-[#001B62]">{title}</h2><p className="mt-3 max-w-md text-sm leading-7 text-[#8190a4]">{description}</p></Link>)}</div></SectionShell>;
}
