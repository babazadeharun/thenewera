import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sha, reject } from "./offer-policy";
import { instagramConfig, sign, safeEqual } from "./instagram-api";
import { igTx, igLock, channelAudit } from "./instagram-connection";
export function verifyInstagramChallenge(q: URLSearchParams) {
  const c = instagramConfig();
  const challenge = q.get("hub.challenge") || "";
  if (
    q.get("hub.mode") !== "subscribe" ||
    !safeEqual(q.get("hub.verify_token") || "", c.verifyToken) ||
    !/^\d{1,256}$/.test(challenge)
  )
    reject("Webhook təsdiqi düzgün deyil.", 403);
  return challenge;
}
export async function instagramWebhook(raw: Buffer, signature: string) {
  const cfg = instagramConfig();
  if (!safeEqual(signature, "sha256=" + sign(raw, cfg.appSecret)))
    reject("Webhook imzası düzgün deyil.", 403);
  let body: any;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    reject("Webhook düzgün deyil.");
  }
  if (body.object !== "instagram" || !Array.isArray(body.entry))
    return { ok: true, ignored: true };
  if (
    body.entry.some((e: any) => !e || typeof e !== "object") ||
    body.entry.length > 50 ||
    body.entry.some((x: any) => x.messaging && !Array.isArray(x.messaging)) ||
    body.entry.reduce(
      (n: number, e: any) => n + (e.messaging?.length || 0),
      0,
    ) > 100
  )
    reject("Webhook paketi çox böyükdür.", 413);
  return igTx(async (db) => {
    await igLock(db);
    const a = await db.salesInstagramAccount.findUnique({
      where: { id: "PLATFORM" },
    });
    if (!a || a.state === "DISCONNECTED" || a.configHash !== cfg.configHash)
      return { ok: true, ignored: true };
    let received = 0;
    for (const entry of body.entry) {
      if (String(entry.id) !== a.externalId) continue;
      for (const e of entry.messaging || []) {
        if (!e || typeof e !== "object") continue;
        const m = e.message,
          from = String(e.sender?.id || ""),
          timestamp = Number(e.timestamp);
        if (
          String(e.recipient?.id) !== a.externalId ||
          !/^\d{1,80}$/.test(from) ||
          from === a.externalId ||
          !m ||
          m.is_echo ||
          m.is_deleted ||
          m.is_edit ||
          typeof m.mid !== "string" ||
          m.mid.length < 1 ||
          m.mid.length > 250 ||
          !Number.isFinite(timestamp) ||
          timestamp <= 0 ||
          timestamp > Date.now() + 60000 ||
          timestamp < Date.now() - 366 * 86400000
        )
          continue;
        const text = typeof m.text === "string" ? m.text.trim() : "",
          attachment =
            Array.isArray(m.attachments) &&
            m.attachments.some(
              (v: any) =>
                v &&
                [
                  "image",
                  "video",
                  "audio",
                  "file",
                  "share",
                  "story_mention",
                  "reel",
                ].includes(v.type),
            );
        if (!text && !attachment) continue;
        const id = sha(a.externalId + ":" + m.mid);
        if (await db.salesInstagramInbound.findUnique({ where: { id } }))
          continue;
        const at = new Date(Math.min(timestamp, Date.now())),
          preview = (text || "[Media mesajı]").slice(0, 500);
        let thread = await db.salesInstagramThread.findUnique({
          where: {
            externalId_contact: { externalId: a.externalId, contact: from },
          },
        });
        if (!thread)
          thread = await db.salesInstagramThread.create({
            data: {
              externalId: a.externalId,
              contact: from,
              lastInboundAt: at,
              lastMessage: preview,
            },
          });
        else if (thread.lastInboundAt < at)
          thread = await db.salesInstagramThread.update({
            where: { id: thread.id },
            data: { lastInboundAt: at, lastMessage: preview },
          });
        await db.salesInstagramInbound.create({
          data: { id, threadId: thread.id, providerAt: at },
        });
        received++;
      }
    }
    if (received)
      await db.salesInstagramAccount.update({
        where: { id: "PLATFORM" },
        data: { lastWebhookAt: new Date() },
      });
    return { ok: true, received };
  });
}
export async function deauthorizeInstagram(signed: string) {
  const cfg = instagramConfig(),
    parts = signed.split(".");
  if (parts.length !== 2 || parts.some((x) => !/^[A-Za-z0-9_-]+$/.test(x)))
    reject("Sorğu düzgün deyil.", 403);
  const [signature, payload] = parts,
    expected = Buffer.from(sign(payload, cfg.appSecret), "hex").toString(
      "base64url",
    );
  if (!safeEqual(signature, expected)) reject("İmza düzgün deyil.", 403);
  let b: any;
  try {
    b = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    reject("Sorğu düzgün deyil.");
  }
  const issued = Number(b.issued_at) * 1000;
  if (
    b.algorithm !== "HMAC-SHA256" ||
    !/^\d{1,80}$/.test(String(b.user_id)) ||
    !Number.isFinite(issued) ||
    issued <= 0 ||
    issued > Date.now() + 60000
  )
    reject("Sorğu düzgün deyil.", 403);
  return igTx(async (db) => {
    await igLock(db);
    const a = await db.salesInstagramAccount.findUnique({
      where: { id: "PLATFORM" },
    });
    if (
      a &&
      [a.subjectId, a.externalId].includes(String(b.user_id)) &&
      issued >= Math.floor(a.connectedAt.getTime() / 1000) * 1000
    ) {
      await db.salesInstagramAccount.update({
        where: { id: a.id },
        data: {
          state: "DISCONNECTED",
          secret: "",
          revision: randomUUID(),
          errorCode: "USER_DEAUTHORIZED",
        },
      });
      await db.salesInstagramAuth.updateMany({
        where: {
          OR: [{ externalId: a.externalId }, { subjectId: a.subjectId }],
          state: { in: ["REVIEW", "SUBSCRIBING"] },
        },
        data: { state: "INVALIDATED", secret: null },
      });
      await channelAudit(db, "SYSTEM", "DEAUTHORIZED", {
        externalId: a.externalId,
      });
    }
    return { ok: true };
  });
}
