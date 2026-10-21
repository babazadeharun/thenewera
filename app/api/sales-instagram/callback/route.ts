import { instagramAdmin, igResponse } from "@/lib/sales/instagram-http";
import { callbackInstagram } from "@/lib/sales/instagram-connection";
import { offerOrigin } from "@/lib/sales/offer-policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(r: Request) {
  let origin;
  try {
    origin = offerOrigin();
  } catch {
    return igResponse({ error: "Instagram üçün sayt ünvanı qurulmayıb." }, 503);
  }
  let path = "/admin/sales-instagram?error=CONNECT_FAILED";
  try {
    const u = await instagramAdmin(),
      result = await callbackInstagram(u, new URL(r.url).searchParams);
    path =
      "/admin/sales-instagram?attempt=" + encodeURIComponent(result.attempt);
  } catch {
    /* Never forward provider error details, codes or tokens into URLs/logs. */
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: origin + path,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
