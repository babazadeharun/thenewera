import { getCurrentUser } from "@/lib/auth";
import { ensureSecondFactor } from "@/lib/crm/security";
import { bytes } from "@/lib/crm/http";
import { CampaignError, reject } from "./offer-policy";
export async function instagramAdmin() {
  const u = await getCurrentUser();
  if (
    !u ||
    !["ADMIN", "SUPER_ADMIN"].includes(u.role) ||
    ["SUSPENDED", "ARCHIVED"].includes(u.accountStatus)
  )
    reject("Admin girişi tələb olunur.", 403);
  await ensureSecondFactor(u.id);
  return u;
}
export const igResponse = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
export async function igHandled(fn: () => Promise<Response>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof CampaignError)
      return igResponse({ error: e.message }, e.status);
    if ((e as any)?.code === "P2002")
      return igResponse(
        { error: "Əməliyyat artıq qeydə alınıb. Siyahını yeniləyin." },
        409,
      );
    if ((e as any)?.status)
      return igResponse({ error: (e as any).message }, (e as any).status);
    console.error(
      "SALES_INSTAGRAM_ERROR",
      e instanceof Error ? e.name : "Error",
    );
    return igResponse(
      {
        error:
          "Instagram əməliyyatı tamamlanmadı. Bağlantını və Meta icazələrini yoxlayın.",
      },
      502,
    );
  }
}
export async function igBody(r: Request) {
  if (r.headers.get("origin") !== new URL(r.url).origin)
    reject("Sorğu mənbəyi uyğun deyil.", 403);
  let b;
  try {
    b = JSON.parse((await bytes(r, 16384)).toString());
  } catch {
    reject("Sorğu düzgün deyil.");
  }
  if (!b || typeof b !== "object" || Array.isArray(b))
    reject("Sorğu düzgün deyil.");
  return b;
}
