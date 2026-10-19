import { getCurrentUser } from "@/lib/auth";
import { account } from "@/lib/crm/security";
import { body, handled, json } from "@/lib/crm/http";
import { fail } from "@/lib/crm/policy";
export const dynamic = "force-dynamic";
export async function GET() {
  return handled(async () => {
    const u = await getCurrentUser();
    if (!u || !u.verifiedAt) fail("Daxil olun.", 401);
    return json(await account(u));
  });
}
export async function POST(r: Request) {
  return handled(async () => {
    const b = await body(r),
      u = await getCurrentUser();
    if (!u || !u.verifiedAt) fail("Daxil olun.", 401);
    return json(await account(u, b));
  });
}
