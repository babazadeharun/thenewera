import { getCurrentUser } from "@/lib/auth";
import { ensureSecondFactor } from "@/lib/crm/security";
import { bytes } from "@/lib/crm/http";
import { CampaignError, reject } from "@/lib/sales/offer-policy";
import {
  offerList,
  offerDetail,
  saveOffer,
  publishOffer,
  revokeOffer,
  sendOffer,
} from "@/lib/sales/offers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
async function handle(req: Request, change = false) {
  try {
    const u = await getCurrentUser();
    if (
      !u ||
      !["ADMIN", "SUPER_ADMIN"].includes(u.role) ||
      ["SUSPENDED", "ARCHIVED"].includes(u.accountStatus)
    )
      reject("Admin girişi tələb olunur.", 403);
    await ensureSecondFactor(u.id);
    if (!change) {
      const q = new URL(req.url).searchParams,
        id = q.get("id"),
        page = Number(q.get("page") || 1);
      if (!Number.isInteger(page) || page < 1 || page > 10000)
        reject("Səhifə düzgün deyil.");
      return json(id ? await offerDetail(id) : await offerList(page));
    }
    if (req.headers.get("origin") !== new URL(req.url).origin)
      reject("Sorğu mənbəyi uyğun deyil.", 403);
    let b;
    try {
      b = JSON.parse((await bytes(req, 262144)).toString());
    } catch {
      reject("Sorğu düzgün deyil.");
    }
    if (!b || typeof b !== "object" || Array.isArray(b))
      reject("Sorğu düzgün deyil.");
    if (b.action === "save") return json(await saveOffer(u.id, b));
    if (b.action === "publish") return json(await publishOffer(u.id, b));
    if (b.action === "revoke") return json(await revokeOffer(u.id, b));
    if (b.action === "send") return json(await sendOffer(u.id, b));
    reject("Əməliyyat düzgün deyil.");
  } catch (e) {
    if (e instanceof CampaignError) return json({ error: e.message }, e.status);
    if ((e as any)?.code === "P2002")
      return json(
        { error: "Paralel dəyişiklik oldu. Siyahını yeniləyin." },
        409,
      );
    if ((e as any)?.status)
      return json({ error: (e as any).message }, (e as any).status);
    console.error("SALES_OFFER_ERROR", e instanceof Error ? e.name : "Error");
    return json({ error: "Təklif əməliyyatı tamamlanmadı." }, 500);
  }
}
export const GET = (r: Request) => handle(r);
export const POST = (r: Request) => handle(r, true);
