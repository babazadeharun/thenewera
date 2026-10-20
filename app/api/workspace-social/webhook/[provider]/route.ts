import { bytes, handled, json } from "@/lib/crm/http";
import {
  hookChannel,
  validSignature,
  receiveSocial,
} from "@/lib/crm/social-webhook";
import { socialConfig } from "@/lib/crm/social-api";
import { fail } from "@/lib/crm/policy";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
type P = { params: Promise<{ provider: string }> };
export async function GET(r: Request, p: P) {
  return handled(async () => {
    const channel = hookChannel((await p.params).provider),
      cfg = socialConfig(channel),
      q = new URL(r.url).searchParams;
    if (
      q.get("hub.mode") !== "subscribe" ||
      q.get("hub.verify_token") !== cfg.verifyToken
    )
      fail("İcazə yoxdur.", 403);
    return new Response(q.get("hub.challenge") || "", {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
export async function POST(r: Request, p: P) {
  return handled(async () => {
    const channel = hookChannel((await p.params).provider),
      cfg = socialConfig(channel),
      raw = await bytes(r, 524288);
    if (
      !validSignature(
        raw,
        r.headers.get("x-hub-signature-256") || "",
        cfg.appSecret,
      )
    )
      fail("İmza düzgün deyil.", 403);
    let payload;
    try {
      payload = JSON.parse(raw.toString("utf8"));
    } catch {
      fail("JSON düzgün deyil.");
    }
    return json(await receiveSocial(channel, payload));
  });
}
