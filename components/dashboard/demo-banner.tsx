"use client";
import { usePathname } from "next/navigation";
export function DemoBanner(){const path=usePathname();return <div className="border-b border-[#e7cf87] bg-[#fff7db] px-5 py-2 text-center text-xs text-[#173257]" role="status"><strong>Demostración local</strong> · {path.startsWith('/recetas')?'Recetas conectadas a PostgreSQL · Base: observatorio_puebla_test · Solo borradores; revisión y archivos pendientes.':'Esta pantalla conserva datos simulados. Abre Recetas para demostrar el guardado real en PostgreSQL.'}</div>}
