import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/crm/providers";
import { bytes, handled, json } from "@/lib/crm/http";
import { tx, lock, hash } from "@/lib/crm/db";
import { fail, state } from "@/lib/crm/policy";
export const dynamic = "force-dynamic";
type P = { params: Promise<{ id: string }> };
function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export async function GET(r: Request, p: P) {
  return handled(async () => {
    const cfg = config((await p.params).id).instagram,
      q = new URL(r.url).searchParams;
    if (
      !cfg?.verifyToken ||
      q.get("hub.mode") !== "subscribe" ||
      !equal(q.get("hub.verify_token") || "", cfg.verifyToken)
    )
      fail("İcazə yoxdur.", 403);
    return new Response(q.get("hub.challenge") || "", {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
export async function POST(r: Request, p: P) {
  return handled(async () => {
    const { id } = await p.params,
      cfg = config(id).instagram;
    if (!cfg?.appSecret || !cfg.accountId) fail("Instagram qoşulmayıb.", 503);
    const raw = await bytes(r, 524288);
    if (
      !equal(
        r.headers.get("x-hub-signature-256") || "",
        "sha256=" +
          createHmac("sha256", cfg.appSecret).update(raw).digest("hex"),
      )
    )
      fail("İmza düzgün deyil.", 403);
    const body = JSON.parse(raw.toString());
    return json(
      await tx(async (db) => {
        if(await db.crmSocialConnection.findUnique({where:{companyId_channel:{companyId:id,channel:'INSTAGRAM'}}}))return {ok:true,ignored:true};
        const c = await lock(db, id);
        if (
          !["TRIAL", "ACTIVE"].includes(state(c)) ||
          !c.features.includes("messages")
        )
          return { ok: true, ignored: true };
        const owner = await db.crmSeat.findFirst({
          where: { companyId: id, role: "OWNER", active: true },
        });
        if (!owner) return { ok: true };
        for (const item of (body.entry || []).slice(0, 20)) {
          if (String(item.id) !== cfg.accountId) continue;
          for (const event of (item.messaging || []).slice(0, 100)) {
            const m = event.message,
              from = String(event.sender?.id || "");
            if (
              String(event.recipient?.id) !== cfg.accountId ||
              !/^\d{1,50}$/.test(from) ||
              !m?.mid ||
              !m.text ||
              m.is_echo
            )
              continue;
            const key = "ig:" + hash(String(m.mid));
            if (
              await db.crmEvent.findUnique({
                where: { companyId_key: { companyId: id, key } },
              })
            )
              continue;
            if (
              (await db.crmEntry.count({
                where: { companyId: id, deletedAt: null },
              })) >= c.records
            )
              fail("Qeyd limiti dolub.", 409);
            const customer = await db.crmEntry.findFirst({
              where: {
                companyId: id,
                kind: "customers",
                deletedAt: null,
                data: { path: ["instagramId"], equals: from },
              },
            });
            const timestamp = Number(event.timestamp),
              at =
                Number.isFinite(timestamp) && timestamp > 0
                  ? new Date(Math.min(Date.now(), timestamp))
                  : new Date();
            const message = await db.crmEntry.create({
              data: {
                companyId: id,
                kind: "messages",
                title: "Instagram mesajı",
                assigneeId: customer?.assigneeId || owner.id,
                participants: customer?.participants || [],
                customerId: customer?.id || null,
                status: "RECEIVED",
                authorId: "SYSTEM",
                createdAt: at,
                data: {
                  channel: "INSTAGRAM",
                  delivery: "RECEIVED",
                  to: from,
                  providerId: String(m.mid),
                  body: String(m.text).slice(0, 20000),
                },
              },
            });
            await db.crmThread.upsert({
              where: {
                companyId_channel_contact: {
                  companyId: id,
                  channel: "INSTAGRAM",
                  contact: from,
                },
              },
              create: {
                companyId: id,
                channel: "INSTAGRAM",
                contact: from,
                title: "Instagram yazışması",
                assigneeId: customer?.assigneeId || owner.id,
                customerId: customer?.id || null,
                lastInboundAt: at,
                responseDueAt: new Date(
                  at.getTime() +
                    (Number((c.preferences as any).slaMinutes) || 30) * 60000,
                ),
              },
              update: {
                status: "OPEN",
                lastInboundAt: at,
                responseDueAt: new Date(
                  at.getTime() +
                    (Number((c.preferences as any).slaMinutes) || 30) * 60000,
                ),
              },
            });
            await db.crmEvent.create({
              data: {
                companyId: id,
                type: "AUDIT",
                key,
                entryId: message.id,
                actorType: "SYSTEM",
                data: { action: "INSTAGRAM_RECEIVED" },
              },
            });
          }
        }
        return { ok: true };
      }),
    );
  });
}
