import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import WhatsappInbox from "./WhatsappInbox";

export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) redirect("/");
  return <WhatsappInbox />;
}
