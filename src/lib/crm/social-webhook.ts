import { inboundLead } from "./lead-flow";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { tx, lock, hash } from "./db";
import { fail, state } from "./policy";
import { socialChannel, socialConfig, type SocialChannel } from "./social-api";
export function hookChannel(provider: string): SocialChannel {
  return socialChannel(
    (
      {
        instagram: "INSTAGRAM",
        facebook: "MESSENGER",
        whatsapp: "WHATSAPP",
      } as Record<string, string>
    )[provider],
  );
}
export function validSignature(raw: Buffer, signature: string, secret: string) {
  const expected =
      "sha256=" + createHmac("sha256", secret).update(raw).digest("hex"),
    a = Buffer.from(expected),
    b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function receiveSocial(channel: SocialChannel, payload: any) {
  const expected = {
    INSTAGRAM: "instagram",
    MESSENGER: "page",
    WHATSAPP: "whatsapp_business_account",
  }[channel];
  if (payload?.object !== expected || !Array.isArray(payload.entry))
    fail("Webhook məlumatı düzgün deyil.");
  let received = 0;
  for (const item of payload.entry.slice(0, 20)) {
    const groups =
      channel === "WHATSAPP"
        ? (Array.isArray(item.changes) ? item.changes : [])
            .slice(0, 20)
            .map((change: any) => ({
              asset: String(change.value?.metadata?.phone_number_id || ""),
              messages: change.value?.messages || [],
              parent: String(item.id || ""),
            }))
        : [
            {
              asset: String(item.id || ""),
              messages: item.messaging || [],
              parent: "",
            },
          ];
    for (const group of groups) {
      if (!/^\d{1,80}$/.test(group.asset) || !Array.isArray(group.messages))
        continue;
      const link = await prisma.crmSocialConnection.findUnique({
        where: { assetKey: channel + ":" + group.asset },
      });
      if (!link || link.state !== "CONNECTED" || !link.readyAt) continue;
      await tx(async (db) => {
        const company = await lock(db, link.companyId),
          fresh = await db.crmSocialConnection.findFirst({
            where: {
              id: link.id,
              assetKey: channel + ":" + group.asset,
              state: "CONNECTED",
            },
          });
        if (
          !fresh ||
          !fresh.readyAt ||
          !["ACTIVE", "TRIAL"].includes(state(company)) ||
          !company.features.includes("messages") ||
          (fresh.expiresAt && fresh.expiresAt < new Date())
        )
          return;
        if (channel === "WHATSAPP" && fresh.parentId !== group.parent) return;
        if (
          !(await db.crmSeat.findFirst({
            where: { id: fresh.memberId, companyId: company.id, active: true },
          }))
        )
          return;
        const owner = await db.crmSeat.findFirst({
          where: { companyId: company.id, role: "OWNER", active: true },
        });
        if (!owner) return;
        for (const event of group.messages.slice(0, 100)) {
          const wa = channel === "WHATSAPP",
            message = wa ? event : event.message,
            from = String(wa ? event.from : event.sender?.id || ""),
            providerId = String(wa ? event.id : message?.mid || ""),
            text = wa ? event.text?.body : message?.text;
          if (
            !/^\d{1,80}$/.test(from) ||
            !providerId ||
            providerId.length > 500 ||
            typeof text !== "string" ||
            !text ||
            message?.is_echo ||
            (!wa && String(event.recipient?.id) !== group.asset) ||
            (wa && event.type !== "text")
          )
            continue;
          const key =
            "social:" + hash(channel + ":" + group.asset + ":" + providerId);
          if (
            await db.crmEvent.findUnique({
              where: { companyId_key: { companyId: company.id, key } },
            })
          )
            continue;
          if (
            (await db.crmEntry.count({
              where: { companyId: company.id, deletedAt: null },
            })) >= company.records
          )
            fail("Qeyd limiti dolub.", 409);
          const lead = await inboundLead(db, company, { channel, contact: from, fallbackId: owner.id });
          const customer = lead.customer;
          const timestamp = Number(event.timestamp) * (wa ? 1000 : 1),
            at =
              Number.isFinite(timestamp) &&
              timestamp > 0 &&
              timestamp < 8640000000000000
                ? new Date(Math.min(Date.now(), timestamp))
                : new Date();
          const created = await db.crmEntry.create({
            data: {
              companyId: company.id,
              kind: "messages",
              title:
                {
                  INSTAGRAM: "Instagram",
                  MESSENGER: "Facebook Messenger",
                  WHATSAPP: "WhatsApp",
                }[channel] + " mesajı",
              status: "RECEIVED",
              assigneeId: lead.assigneeId,
              participants: customer?.participants || [],
              customerId: customer?.id || null,
              saleId: lead.sale?.id || null,
              authorId: "SYSTEM",
              createdAt: at,
              data: {
                channel,
                delivery: "RECEIVED",
                to: from,
                providerId,
                body: text.slice(0, 20000),
                socialConnectionId: fresh.id,
                socialAccountId: fresh.externalId,
              },
            },
          });
          const existing = await db.crmThread.findUnique({
              where: {
                companyId_channel_contact: {
                  companyId: company.id,
                  channel,
                  contact: from,
                },
              },
            }),
            due = new Date(
              at.getTime() +
                (Number((company.preferences as any).slaMinutes) || 30) * 60000,
            );
          await db.crmThread.upsert({
            where: {
              companyId_channel_contact: {
                companyId: company.id,
                channel,
                contact: from,
              },
            },
            create: {
              companyId: company.id,
              channel,
              contact: from,
              title: "Yeni yazışma",
              assigneeId: lead.assigneeId,
              customerId: customer?.id || null,
              lastInboundAt: at,
              responseDueAt: due,
            },
            update:
              !existing?.lastInboundAt || existing.lastInboundAt < at
                ? { status: "OPEN", lastInboundAt: at, responseDueAt: existing?.responseDueAt && (!existing.lastOutboundAt || !existing.lastInboundAt || existing.lastOutboundAt < existing.lastInboundAt) ? existing.responseDueAt : due, customerId: customer?.id || null, assigneeId: lead.assigneeId }
                : {},
          });
          await db.crmEvent.create({
            data: {
              companyId: company.id,
              type: "AUDIT",
              key,
              entryId: created.id,
              actorType: "SYSTEM",
              data: { action: channel + "_RECEIVED", connectionId: fresh.id },
            },
          });
          received++;
        }
      });
    }
  }
  return { ok: true, received };
}
