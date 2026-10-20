import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { bytes, handled, json } from "@/lib/crm/http";
import { hookChannel } from "@/lib/crm/social-webhook";
import { socialConfig } from "@/lib/crm/social-api";
import { fail } from "@/lib/crm/policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(
  r: Request,
  p: { params: Promise<{ provider: string }> },
) {
  return handled(async () => {
    const channel = hookChannel((await p.params).provider),
      cfg = socialConfig(channel);
    const form = new URLSearchParams((await bytes(r, 16384)).toString("utf8")),
      signed = form.get("signed_request") || "",
      parts = signed.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1])
      fail("İmza düzgün deyil.", 403);
    const expected = createHmac("sha256", cfg.appSecret)
        .update(parts[1])
        .digest(),
      received = Buffer.from(parts[0], "base64url");
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      fail("İmza düzgün deyil.", 403);
    let payload;
    try {
      payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    } catch {
      fail("Məlumat düzgün deyil.");
    }
    if (
      payload.algorithm !== "HMAC-SHA256" ||
      !/^\d{1,80}$/.test(String(payload.user_id || "")) ||
      !Number.isFinite(Number(payload.issued_at)) ||
      Number(payload.issued_at) > Date.now() / 1000 + 300
    )
      fail("Məlumat düzgün deyil.", 403);
    const channels =
      channel === "INSTAGRAM" ? ["INSTAGRAM"] : ["MESSENGER", "WHATSAPP"];
    const rows = await prisma.crmSocialConnection.findMany({
      where: {
        subjectId: String(payload.user_id),
        channel: { in: channels },
        state: { not: "DISCONNECTED" },
        readyAt: { lte: new Date(Number(payload.issued_at) * 1000 + 1000) },
      },
    });
    for (const row of rows)
      await prisma.$transaction(async (db) => {
        const changed = await db.crmSocialConnection.updateMany({
          where: { id: row.id, updatedAt: row.updatedAt },
          data: {
            state: "RECONNECT_REQUIRED",
            secret: "",
            errorCode: "RECONNECT_REQUIRED",
            attemptId: null,
          },
        });
        if (changed.count)
          await db.crmEvent.create({
            data: {
              companyId: row.companyId,
              type: "AUDIT",
              actorType: "SYSTEM",
              data: {
                action: "SOCIAL_PERMISSION_REMOVED",
                channel: row.channel,
              },
            },
          });
      });
    return json({ ok: true });
  });
}
