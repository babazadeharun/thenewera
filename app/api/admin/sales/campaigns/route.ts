import { getCurrentUser } from "@/lib/auth";
import { ensureSecondFactor } from "@/lib/crm/security";
import { bytes } from "@/lib/crm/http";
import { CampaignError, reject } from "@/lib/sales/campaign-policy";
import {
  campaignList,
  campaignDetail,
  createCampaign,
  controlCampaign,
  recipientAction,
  runCampaigns,
} from "@/lib/sales/campaigns";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const json = (x: unknown, status = 200) =>
  Response.json(x, {
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
      !u.verifiedAt ||
      ["SUSPENDED", "ARCHIVED"].includes(u.accountStatus)
    )
      reject("Admin girişi tələb olunur.", 403);
    await ensureSecondFactor(u.id);
    if (!change) {
      const q = new URL(req.url).searchParams,
        id = q.get("id");
      const page = Number(q.get("page") || 1);
      if (!Number.isInteger(page) || page < 1 || page > 10000)
        reject("Səhifə düzgün deyil.");
      return json(id ? await campaignDetail(id, page) : await campaignList());
    }
    if (req.headers.get("origin") !== new URL(req.url).origin)
      reject("Sorğu mənbəyi uyğun deyil.", 403);
    let b;
    try {
      b = JSON.parse((await bytes(req, 524288)).toString());
    } catch {
      reject("Sorğu düzgün deyil.");
    }
    if (!b || typeof b !== "object" || Array.isArray(b))
      reject("Sorğu düzgün deyil.");
    if (b.action === "create") return json(await createCampaign(u.id, b), 201);
    if (["approve", "resume", "pause", "cancel"].includes(b.action))
      return json(await controlCampaign(u.id, b));
    if (b.action === "recipient") return json(await recipientAction(u.id, b));
    if (b.action === "run") {
      if (b.confirm !== true) reject("Növbənin emalını təsdiqləyin.");
      return json(await runCampaigns());
    }
    reject("Əməliyyat düzgün deyil.");
  } catch (e) {
    if (e instanceof CampaignError) return json({ error: e.message }, e.status);
    if ((e as any)?.code === "P2002")
      return json(
        { error: "Əməliyyat artıq qeydə alınıb. Siyahını yeniləyin." },
        409,
      );
    if ((e as any)?.status && typeof (e as any).message === "string")
      return json({ error: (e as Error).message }, (e as any).status);
    console.error(
      "SALES_CAMPAIGN_ERROR",
      e instanceof Error ? e.name : "Error",
    );
    return json({ error: "Kampaniya əməliyyatı tamamlanmadı." }, 500);
  }
}
export const GET = (r: Request) => handle(r);
export const POST = (r: Request) => handle(r, true);
