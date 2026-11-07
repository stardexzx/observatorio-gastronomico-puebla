import { Toaster } from "@/components/ui/sonner";
import { ReportsCenter } from "@/modules/reports/reports-center";
import { PublicReports } from "@/modules/public/public-reports";
import { getSessionUser } from "@/lib/auth/session";
export default async function Page(){return await getSessionUser() ? <><ReportsCenter/><Toaster position="bottom-right" richColors/></> : <PublicReports/>;}
