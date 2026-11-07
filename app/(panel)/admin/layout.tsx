import { requireSessionUser } from "@/lib/auth/session";
export default async function AdminLayout({children}:{children:React.ReactNode}){
  await requireSessionUser();
  return children;
}
