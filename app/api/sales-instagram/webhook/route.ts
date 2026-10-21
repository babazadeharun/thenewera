import { bytes } from "@/lib/crm/http";
import { igResponse, igHandled } from "@/lib/sales/instagram-http";
import {
  verifyInstagramChallenge,
  instagramWebhook,
} from "@/lib/sales/instagram-webhook";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const GET = (r: Request) =>
  igHandled(
    async () =>
      new Response(verifyInstagramChallenge(new URL(r.url).searchParams), {
        headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
      }),
  );
export const POST = (r: Request) =>
  igHandled(async () =>
    igResponse(
      await instagramWebhook(
        await bytes(r, 524288),
        r.headers.get("x-hub-signature-256") || "",
      ),
    ),
  );
