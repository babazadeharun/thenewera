import { timingSafeEqual } from "node:crypto";
import { runCampaigns } from "@/lib/sales/campaigns";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(r: Request) {
  const key = process.env.SALES_CAMPAIGN_CRON_SECRET || process.env.CRON_SECRET;
  if (!key || key.length < 32)
    return Response.json(
      { error: "Scheduler açarı qurulmayıb." },
      { status: 503 },
    );
  const a = Buffer.from(r.headers.get("authorization") || ""),
    b = Buffer.from("Bearer " + key);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return Response.json({ error: "İcazə yoxdur." }, { status: 403 });
  try {
    return Response.json(await runCampaigns(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error:
          "Göndəriş və ya poçt yoxlaması tamamlanmadı. Admin paneldə vəziyyəti yoxlayın.",
      },
      { status: 503 },
    );
  }
}
