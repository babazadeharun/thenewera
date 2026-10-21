import { bytes } from "@/lib/crm/http";
import { CampaignError, reject } from "@/lib/sales/offer-policy";
import {
  viewOffer,
  requestOfferCode,
  confirmOfferCode,
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
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
// Capability token lives in the browser URL fragment, never a query string or access log.
// GET is intentionally unsupported: opening a link never accepts a proposal or sends mail.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (req.headers.get("origin") !== new URL(req.url).origin)
      reject("Sorğu mənbəyi uyğun deyil.", 403);
    let b;
    try {
      b = JSON.parse((await bytes(req, 8192)).toString());
    } catch {
      reject("Sorğu düzgün deyil.");
    }
    if (!b || typeof b !== "object" || Array.isArray(b))
      reject("Sorğu düzgün deyil.");
    const { id } = await ctx.params;
    if (b.action === "view") return json(await viewOffer(id, b.token));
    if (b.action === "track") return json(await viewOffer(id, b.token, true));
    if (b.action === "code") return json(await requestOfferCode(id, b));
    if (b.action === "confirm") return json(await confirmOfferCode(id, b));
    reject("Əməliyyat düzgün deyil.");
  } catch (e) {
    if (e instanceof CampaignError) return json({ error: e.message }, e.status);
    if ((e as any)?.status)
      return json({ error: (e as any).message }, (e as any).status);
    console.error("PUBLIC_OFFER_ERROR", e instanceof Error ? e.name : "Error");
    return json(
      {
        error:
          "Təklif sorğusu tamamlanmadı. Bir qədər sonra yenidən cəhd edin.",
      },
      500,
    );
  }
}
