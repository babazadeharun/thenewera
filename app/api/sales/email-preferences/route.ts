import { unsubscribe } from "@/lib/sales/campaigns";
import { CampaignError } from "@/lib/sales/campaign-policy";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// A signed POST is intentional for RFC 8058 one-click unsubscribe.
// Merely viewing a link never changes a recipient or reveals their address.
export async function POST(r: Request) {
  const q = new URL(r.url).searchParams;
  try {
    await unsubscribe(q.get("id") || "", q.get("sig") || "");
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof CampaignError ? e.message : "Əməliyyat tamamlanmadı.",
      },
      {
        status: e instanceof CampaignError ? e.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
