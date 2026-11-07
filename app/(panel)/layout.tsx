import { getSessionUser } from "@/lib/auth/session";
import { SessionProvider } from "@/components/auth/session-provider";
import { PublicCatalogProvider } from "@/components/public/public-catalog-provider";
export const dynamic="force-dynamic";
export default async function PanelLayout({children}:{children:React.ReactNode}){const user=await getSessionUser();return <SessionProvider user={user}><PublicCatalogProvider>{children}</PublicCatalogProvider></SessionProvider>;}
