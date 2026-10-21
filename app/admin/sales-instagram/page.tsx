import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import InstagramSettings from "./Settings";
export const dynamic = "force-dynamic";
export default async function Page() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (!["ADMIN", "SUPER_ADMIN"].includes(u.role)) redirect("/");
  return <InstagramSettings />;
}
