import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "@/modules/auth/login-form";
export const dynamic="force-dynamic";
export const metadata={title:"Iniciar sesión · Observatorio Gastronómico de Puebla",robots:{index:false,follow:false}};
export default async function Page(){if(await getSessionUser())redirect('/');return <LoginForm/>;}
