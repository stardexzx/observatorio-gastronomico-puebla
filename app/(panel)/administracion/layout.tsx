import { redirect } from "next/navigation";
import { requireSessionUser } from "@/lib/auth/session";
export default async function AdministrationLayout({children}:{children:React.ReactNode}){const user=await requireSessionUser();if(user.role!=='administrador')redirect('/');return children;}
