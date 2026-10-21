import {
  instagramAdmin,
  igResponse,
  igHandled,
  igBody,
} from "@/lib/sales/instagram-http";
import {
  instagramStatus,
  beginInstagram,
  confirmInstagram,
  disconnectInstagram,
} from "@/lib/sales/instagram-connection";
import {
  instagramOfferOptions,
  previewInstagramOffer,
  sendInstagramOffer,
} from "@/lib/sales/instagram-offers";
import { reject } from "@/lib/sales/offer-policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const GET = (r: Request) =>
  igHandled(async () => {
    const u = await instagramAdmin(),
      q = new URL(r.url).searchParams,
      page = Number(q.get("page") || 1),
      search = q.get("q") || "";
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 10000 ||
      search.length > 200
    )
      reject("Axtarış parametrləri düzgün deyil.");
    return igResponse(
      q.get("offerId")
        ? await instagramOfferOptions(q.get("offerId")!, page, search)
        : await instagramStatus(u, q.get("attempt") || undefined),
    );
  });
export const POST = (r: Request) =>
  igHandled(async () => {
    const u = await instagramAdmin(),
      b = await igBody(r);
    if (b.action === "connect") return igResponse(await beginInstagram(u));
    if (b.action === "confirm-connection")
      return igResponse(await confirmInstagram(u, b));
    if (b.action === "disconnect")
      return igResponse(await disconnectInstagram(u, b));
    if (b.action === "preview")
      return igResponse(await previewInstagramOffer(u, b));
    if (b.action === "send") return igResponse(await sendInstagramOffer(u, b));
    reject("Əməliyyat düzgün deyil.");
  });
