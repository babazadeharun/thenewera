import { bytes } from "@/lib/crm/http";
import { igResponse, igHandled } from "@/lib/sales/instagram-http";
import { deauthorizeInstagram } from "@/lib/sales/instagram-webhook";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = (r: Request) =>
  igHandled(async () => {
    const raw = await bytes(r, 16384),
      signed = new URLSearchParams(raw.toString()).get("signed_request") || "";
    return igResponse(await deauthorizeInstagram(signed));
  });
