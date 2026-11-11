import { prisma } from "@/lib/prisma";
import { instagramAdmin, igBody, igResponse } from "@/lib/sales/instagram-http";
import { CampaignError, reject } from "@/lib/sales/offer-policy";
import { draftWhatsapp, inbox, phoneOf, sendWhatsapp, stages, verifyWhatsappConnection } from "@/lib/sales/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handled(run: () => Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof CampaignError) return igResponse({ error: error.message }, error.status);
    const e = error as { status?: number; code?: string; message?: string } | null;
    if (e?.code === "P2002") return igResponse({ error: "Bu göndəriş artıq qeydə alınıb." }, 409);
    if (e?.status && e.status >= 400 && e.status < 500) return igResponse({ error: e.message }, e.status);
    console.error("SALES_WHATSAPP_ERROR", error instanceof Error ? error.name : "Error");
    return igResponse({ error: "WhatsApp əməliyyatı tamamlanmadı. Tarixçəni və bağlantını yoxlayın." }, 502);
  }
}

export const GET = (req: Request) => handled(async () => {
  await instagramAdmin();
  const params = new URL(req.url).searchParams;
  return igResponse(await inbox(phoneOf(params.get("phone")), (params.get("deal") || "").slice(0, 100)));
});

export const POST = (req: Request) => handled(async () => {
  const user = await instagramAdmin();
  const b = await igBody(req);
  if (b.action === "verify-connection") return igResponse({ connection: await verifyWhatsappConnection() });
  const phone = phoneOf(b.phone);
  if (!phone) reject("Düzgün telefon nömrəsi tələb olunur.");
  if (b.action === "draft") return igResponse({ draft: await draftWhatsapp(phone) });
  if (b.action === "send") {
    if (typeof b.requestKey !== "string" || !/^[a-f0-9-]{36}$/i.test(b.requestKey)) reject("Göndəriş açarı düzgün deyil.");
    await sendWhatsapp(phone, {
      requestKey: b.requestKey,
      offerId: typeof b.offerId === "string" ? b.offerId : undefined,
      text: typeof b.text === "string" ? b.text : undefined,
    });
    if (b.compact === true) return igResponse({ sent: true });
  } else if (b.action === "consent") {
    if (typeof b.note !== "string" || !b.note.trim() || b.note.length > 400) reject("Razılığın mənbəyini qeyd edin.");
    const consentNote = user.id + ": " + b.note.trim();
    const consentAt = new Date();
    await prisma.salesWhatsappContact.upsert({ where: { phone },
      create: { phone, consentAt, consentNote },
      update: { consentAt, consentNote, optedOutAt: null } });
  } else if (b.action === "stop") {
    const optedOutAt = new Date();
    await prisma.salesWhatsappContact.upsert({ where: { phone },
      create: { phone, optedOutAt }, update: { optedOutAt } });
  } else if (b.action === "stage") {
    if (!stages.includes(b.stage)) reject("Satış mərhələsini seçin.");
    const followUpAt = b.followUp ? new Date(b.followUp) : null;
    if (followUpAt && !Number.isFinite(followUpAt.getTime())) reject("Tarix düzgün deyil.");
    await prisma.salesWhatsappContact.upsert({ where: { phone },
      create: { phone, stage: b.stage, followUpAt }, update: { stage: b.stage, followUpAt } });
  } else reject("Əməliyyat düzgün deyil.");
  return igResponse(await inbox(phone));
});
