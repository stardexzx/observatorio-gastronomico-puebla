import { requireSessionUser } from "@/lib/auth/session";
import { SessionProvider } from "@/components/auth/session-provider";
export const dynamic="force-dynamic";
export default async function PanelLayout({children}:{children:React.ReactNode}){const user=await requireSessionUser();return <SessionProvider user={user}>{children}</SessionProvider>;}
