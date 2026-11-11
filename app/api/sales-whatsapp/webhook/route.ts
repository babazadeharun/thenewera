import { prisma } from "@/lib/prisma";
import { bytes } from "@/lib/crm/http";
import { deliveryAfter, equal, phoneOf, validSignature, whatsappConfig } from "@/lib/sales/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const query = new URL(req.url).searchParams;
  const { verify } = whatsappConfig();
  if (!verify || query.get("hub.mode") !== "subscribe" ||
      !equal(query.get("hub.verify_token") || "", verify)) return new Response(null, { status: 403 });
  return new Response(query.get("hub.challenge") || "", { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  try {
    const raw = await bytes(req, 524288);
    if (!validSignature(raw, req.headers.get("x-hub-signature-256") || "")) return new Response(null, { status: 403 });
    const data = JSON.parse(raw.toString());
    if (data.object !== "whatsapp_business_account") return Response.json({ ok: true });
    for (const entry of data.entry || []) for (const change of entry.changes || []) {
      const value = change.value;
      if (change.field !== "messages" || !value?.metadata?.phone_number_id ||
          String(value.metadata.phone_number_id) !== whatsappConfig().phoneId) continue;
      for (const item of value.messages || []) {
        const phone = phoneOf(item.from);
        const body = item.text?.body ?? item.button?.text ?? item.interactive?.button_reply?.title ??
          item.interactive?.list_reply?.title ?? `[${item.type || "mesaj"}]`;
        const createdAt = new Date(Number(item.timestamp) * 1000);
        if (!phone || typeof item.id !== "string" || typeof body !== "string" ||
            !Number.isFinite(createdAt.getTime()) || createdAt.getTime() > Date.now() + 60_000) continue;
        const stop = /^(stop|dayan|çıxış|abunəliyi dayandır|mesaj göndərməyin)[.!\s]*$/iu.test(body.trim());
        await prisma.$transaction(async db => {
          await db.salesWhatsappContact.upsert({ where: { phone }, create: { phone }, update: {} });
          const inserted = await db.salesWhatsappMessage.createMany({
            data: [{ phone, providerId: item.id, direction: "IN", status: "RECEIVED", body: body.slice(0, 4096), createdAt }],
            skipDuplicates: true,
          });
          if (!inserted.count) return;
          await db.salesWhatsappContact.updateMany({ where: { phone, OR: [{ lastInboundAt: null }, { lastInboundAt: { lt: createdAt } }] },
            data: { lastInboundAt: createdAt } });
          if (stop) await db.salesWhatsappContact.updateMany({ where: { phone,
            OR: [{ consentAt: null }, { consentAt: { lte: createdAt } }] }, data: { optedOutAt: createdAt } });
        });
      }
      for (const status of value.statuses || []) {
        const next = typeof status.status === "string" ? status.status.toUpperCase() : "";
        if (!["SENT", "DELIVERED", "READ", "FAILED"].includes(next) || typeof status.id !== "string") continue;
        const phone = phoneOf(status.recipient_id);
        const attempt = typeof status.biz_opaque_callback_data === "string" ? status.biz_opaque_callback_data : "";
        const possible = ["PENDING", "UNKNOWN", "ACCEPTED", "SENT", "DELIVERED"].filter(s => deliveryAfter(s, next));
        await prisma.salesWhatsappMessage.updateMany({ where: { phone, direction: "OUT", status: { in: possible },
          OR: [{ providerId: status.id }, { id: attempt, providerId: null }] }, data: { providerId: status.id, status: next } });
      }
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Webhook emal edilmədi." }, { status: 500 });
  }
}
