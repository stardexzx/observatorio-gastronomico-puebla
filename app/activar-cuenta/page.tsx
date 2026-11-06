import { activationInfo } from "@/lib/auth/accounts";
import { ActivationForm, InvalidActivation } from "@/modules/auth/login-form";
export const dynamic="force-dynamic";
export const metadata={title:"Activa tu cuenta · Observatorio Gastronómico de Puebla",referrer:"no-referrer",robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}){const {token}=await searchParams;const account=token?await activationInfo(token):null;return account&&token?<ActivationForm token={token} email={account.email}/>:<InvalidActivation/>;}
