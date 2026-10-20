import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { smtpConfigured, sendMail } from "@/lib/mail/smtp";
import { mailConfigured } from "@/lib/mail/imap";
import { inspectReplies } from "./campaign-mail";
import {
  campaignConfig,
  CampaignError,
  reject,
  email,
  steps,
  integer,
  digest,
  render,
  optOutURL,
  validOptOut,
  inWindow,
  localDay,
  stopStatuses,
  type Step,
} from "./campaign-policy";

const pending = ["PENDING", "SENDING"];
const dbtx = <T>(fn: (db: Prisma.TransactionClient) => Promise<T>) =>
  prisma.$transaction(fn, { timeout: 15000 });
async function lock(db: Prisma.TransactionClient) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(73021109)`;
}
async function activeAdmin(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, accountStatus: true, verifiedAt: true },
  });
  return Boolean(
    u &&
      ["ADMIN", "SUPER_ADMIN"].includes(u.role) &&
      !["SUSPENDED", "ARCHIVED"].includes(u.accountStatus) &&
      u.verifiedAt,
  );
}
function ready() {
  const c = campaignConfig();
  if (!c.ready || !smtpConfigured() || !mailConfigured())
    reject(
      "Kampaniya üçün SMTP, IMAP, HTTPS ünvanı və imza açarı qurulmalıdır.",
      503,
    );
  return c;
}
export async function campaignList() {
  const items = await prisma.salesCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { recipients: true } } },
  });
  const totals = await prisma.salesCampaignRecipient.groupBy({
    by: ["campaignId", "state"],
    where: { campaignId: { in: items.map((x) => x.id) } },
    _count: { _all: true },
  });
  const worker = await prisma.salesCampaignWorker.findUnique({
    where: { id: "EMAIL" },
    select: { lastCheckedAt: true, lastError: true },
  });
  const c = campaignConfig();
  return {
    items: items.map((x) => ({
      ...x,
      counts: Object.fromEntries(
        totals
          .filter((t) => t.campaignId === x.id)
          .map((t) => [t.state, t._count._all]),
      ),
    })),
    worker,
    config: {
      sender: c.sender,
      replyTo: c.replyTo,
      ready: c.ready && smtpConfigured() && mailConfigured(),
      enabled: c.enabled,
      globalLimit: c.globalLimit,
    },
  };
}
export async function campaignDetail(id: string, page = 1) {
  const c = await prisma.salesCampaign.findUnique({ where: { id } });
  if (!c) reject("Kampaniya tapılmadı.", 404);
  const recipients = await prisma.salesCampaignRecipient.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
    skip: (page - 1) * 50,
    take: 50,
    include: {
      deliveries: { orderBy: { step: "asc" } },
      deal: { select: { stage: true, proposalStatus: true } },
    },
  });
  const all = await prisma.salesCampaignRecipient.findMany({
    where: { campaignId: id },
    select: { id: true, email: true, fields: true },
    orderBy: { id: "asc" },
  });
  const reviewKey = digest(
    JSON.stringify([
      c.id,
      c.steps,
      c.startsAt,
      c.sender,
      c.replyTo,
      c.configHash,
      all,
    ]),
  );
  return {
    campaign: c,
    total: all.length,
    page,
    reviewKey,
    recipients: recipients.map((r) => ({
      ...r,
      preview: (c.steps as Step[]).map((s) =>
        render(s, r.fields as Record<string, string>, r.id),
      ),
    })),
  };
}
export async function createCampaign(
  actorId: string,
  b: Record<string, unknown>,
) {
  const cfg = ready();
  const name = String(b.name || "").trim();
  if (!name || name.length > 120) reject("Kampaniya adını daxil edin.");
  if (
    !Array.isArray(b.dealIds) ||
    !b.dealIds.length ||
    b.dealIds.length > 300 ||
    b.dealIds.some((x) => typeof x !== "string" || x.length > 100)
  )
    reject("1–300 satış seçin.");
  const sequence = steps(b.steps),
    dailyLimit = integer(b.dailyLimit, 1, Math.min(100, cfg.globalLimit)),
    startHour = integer(b.startHour, 0, 23),
    endHour = integer(b.endHour, 1, 24);
  if (endHour <= startHour)
    reject("Bitmə saatı başlama saatından sonra olmalıdır.");
  const startsAt = b.startsAt ? new Date(String(b.startsAt)) : new Date();
  if (!Number.isFinite(startsAt.getTime()))
    reject("Başlama tarixi düzgün deyil.");
  const deals = await prisma.salesDeal.findMany({
    where: { id: { in: b.dealIds as string[] } },
    include: {
      client: { select: { company: true, email: true } },
      service: { select: { name: true } },
    },
  });
  if (deals.length !== new Set(b.dealIds).size)
    reject("Seçilmiş satışlardan biri tapılmadı.");
  const suppressions = await prisma.salesEmailSuppression.findMany({
    where: {
      email: {
        in: deals.map((x) => email(x.email || x.client?.email)).filter(Boolean),
      },
    },
  });
  const seen = new Set<string>(),
    skipped: Array<{ title: string; reason: string }> = [];
  const recipients = deals.flatMap((d) => {
    const address = email(d.email || d.client?.email);
    let reason = "";
    if (!address) reason = "Düzgün e-poçt yoxdur";
    else if (seen.has(address)) reason = "Təkrar e-poçt";
    else if (suppressions.some((s) => s.email === address))
      reason = "Göndərişdən imtina edib";
    else if (
      ["WON", "LOST", "NEGOTIATION"].includes(d.stage) ||
      stopStatuses.includes(d.proposalStatus || "") ||
      ["SENT", "WAITING"].includes(d.proposalStatus || "") ||
      d.proposalResponse?.trim()
    )
      reason = "Əvvəlki əlaqə və ya bağlanmış satış var";
    if (reason) {
      skipped.push({ title: d.title, reason });
      return [];
    }
    seen.add(address);
    const fields = {
      name: (d.contactName || "").replace(/[\r\n]/g, " ").slice(0, 200),
      company: (d.client?.company || d.title)
        .replace(/[\r\n]/g, " ")
        .slice(0, 200),
      service: (d.service?.name || "xidmətlərimiz")
        .replace(/[\r\n]/g, " ")
        .slice(0, 200),
    };
    return [{ dealId: d.id, email: address, fields, nextAt: startsAt }];
  });
  if (!recipients.length) reject("Göndəriş üçün uyğun alıcı yoxdur.");
  const c = await prisma.salesCampaign.create({
    data: {
      name,
      steps: sequence,
      sender: cfg.sender,
      replyTo: cfg.replyTo,
      origin: cfg.origin,
      configHash: cfg.configHash,
      dailyLimit,
      startHour,
      endHour,
      weekdaysOnly: b.weekdaysOnly !== false,
      createdByUserId: actorId,
      startsAt,
      recipients: { create: recipients },
    },
  });
  return { ...(await campaignDetail(c.id)), skipped };
}
export async function controlCampaign(
  actorId: string,
  b: Record<string, unknown>,
) {
  const id = String(b.id || ""),
    action = String(b.action || "");
  if (action === "approve" || action === "resume") {
    const cfg = ready();
    if (!cfg.enabled)
      reject("Serverdə kampaniya göndərişi aktivləşdirilməyib.", 503);
    if (b.confirm !== true)
      reject("Alıcıları və bütün məktubları ayrıca təsdiqləyin.");
    const detail = await campaignDetail(id);
    if (detail.reviewKey !== b.reviewKey)
      reject("Kampaniya dəyişib. Baxışı yeniləyin.", 409);
    return dbtx(async (db) => {
      await lock(db);
      const c = await db.salesCampaign.findUnique({ where: { id } });
      if (!c || c.state !== (action === "approve" ? "DRAFT" : "PAUSED"))
        reject("Kampaniyanın vəziyyəti dəyişib.", 409);
      if (c.configHash !== cfg.configHash)
        reject("Poçt konfiqurasiyası dəyişib. Yeni qaralama yaradın.", 409);
      const rs = await db.salesCampaignRecipient.findMany({
        where: { campaignId: id, state: "PENDING" },
      });
      if (!rs.length) reject("Növbəyə qoyulacaq alıcı qalmayıb.", 409);
      for (const r of rs) {
        const other = await db.salesCampaignRecipient.findFirst({
          where: {
            email: r.email,
            campaignId: { not: id },
            state: { in: [...pending, "UNCERTAIN"] },
            OR: [
              { campaign: { state: { in: ["ACTIVE", "PAUSED"] } } },
              { state: "UNCERTAIN" },
            ],
          },
        });
        if (other)
          reject(
            `${r.email} üçün başqa kampaniyada davam edən və ya nəticəsi yoxlanmalı göndəriş var. Əvvəl onu yoxlayıb dayandırın.`,
            409,
          );
      }
      await db.salesCampaign.update({
        where: { id },
        data: {
          state: "ACTIVE",
          approvedByUserId: actorId,
          approvedAt: new Date(),
        },
      });
      return { ok: true };
    });
  }
  if (!["pause", "cancel"].includes(action)) reject("Əməliyyat düzgün deyil.");
  return dbtx(async (db) => {
    await lock(db);
    const c = await db.salesCampaign.findUnique({ where: { id } });
    if (!c) reject("Kampaniya tapılmadı.", 404);
    if (!["DRAFT", "ACTIVE", "PAUSED"].includes(c.state))
      reject("Kampaniya artıq bağlanıb.", 409);
    await db.salesCampaign.update({
      where: { id },
      data: { state: action === "pause" ? "PAUSED" : "CANCELLED" },
    });
    if (action === "cancel")
      await db.salesCampaignRecipient.updateMany({
        where: { campaignId: id, state: { in: pending } },
        data: { state: "STOPPED", stopReason: "Kampaniya ləğv edilib" },
      });
    return { ok: true };
  });
}
async function stopRecipient(
  id: string,
  reason: string,
  kind = "STOPPED",
  actorId?: string,
) {
  return dbtx(async (db) => {
    await lock(db);
    const r = await db.salesCampaignRecipient.findUnique({
      where: { id },
      include: { deal: true },
    });
    if (!r) return;
    const changed = await db.salesCampaignRecipient.updateMany({
      where: {
        id,
        state: {
          in: [
            "PENDING",
            "SENDING",
            "COMPLETED",
            "UNCERTAIN",
            "FAILED",
            "REVIEW",
          ],
        },
      },
      data: {
        state: kind,
        stopReason: reason,
        ...(kind === "REPLIED" ? { repliedAt: new Date() } : {}),
      },
    });
    if (!changed.count) return;
    if (r.dealId && r.deal) {
      if (
        kind === "REPLIED" &&
        !["WON", "LOST"].includes(r.deal.stage) &&
        !stopStatuses.includes(r.deal.proposalStatus || "")
      )
        await db.salesDeal.update({
          where: { id: r.dealId },
          data: { proposalStatus: "RESPONDED" },
        });
      await db.salesActivity.create({
        data: {
          dealId: r.dealId,
          type: kind === "REPLIED" || kind === "REVIEW" ? "FOLLOW_UP" : "NOTE",
          text: `Kampaniya: ${reason}`,
          dueAt: kind === "REPLIED" || kind === "REVIEW" ? new Date() : null,
          createdByUserId: actorId || null,
          clientId: r.deal.clientId,
          projectId: r.deal.projectId,
        },
      });
    }
  });
}
export async function recipientAction(
  actorId: string,
  b: Record<string, unknown>,
) {
  const r = await prisma.salesCampaignRecipient.findUnique({
    where: { id: String(b.recipientId || "") },
  });
  if (!r) reject("Alıcı tapılmadı.", 404);
  if (b.outcome === "unsubscribe") {
    await suppress(r.email, "Admin tərəfindən imtina qeydə alındı");
    return { ok: true };
  }
  if (!["reply", "meeting", "declined", "stop"].includes(String(b.outcome)))
    reject("Nəticə düzgün deyil.");
  const label = {
    reply: "Cavab alındı",
    meeting: "Görüş təyin edildi",
    declined: "İmtina etdi",
    stop: "Admin dayandırdı",
  }[String(b.outcome)]!;
  const related = await prisma.salesCampaignRecipient.findMany({
    where: {
      email: r.email,
      state: {
        in: [
          "PENDING",
          "SENDING",
          "COMPLETED",
          "UNCERTAIN",
          "FAILED",
          "REVIEW",
        ],
      },
    },
  });
  for (const x of related)
    await stopRecipient(
      x.id,
      label,
      b.outcome === "reply" ? "REPLIED" : "STOPPED",
      actorId,
    );
  if (r.dealId && b.outcome !== "stop")
    await prisma.salesDeal.update({
      where: { id: r.dealId },
      data: {
        proposalStatus: {
          reply: "RESPONDED",
          meeting: "MEETING",
          declined: "DECLINED",
        }[String(b.outcome)],
        ...(b.outcome === "declined"
          ? { proposalResponse: "Kampaniyada imtina qeydə alındı." }
          : {}),
      },
    });
  return { ok: true };
}
async function suppress(address: string, reason: string) {
  await dbtx(async (db) => {
    await lock(db);
    await db.salesEmailSuppression.upsert({
      where: { email: address },
      create: { email: address, reason },
      update: { reason },
    });
    await db.salesCampaignRecipient.updateMany({
      where: {
        email: address,
        state: {
          in: [
            "PENDING",
            "SENDING",
            "COMPLETED",
            "UNCERTAIN",
            "FAILED",
            "REVIEW",
          ],
        },
      },
      data: { state: "UNSUBSCRIBED", stopReason: reason },
    });
  });
}
export async function unsubscribe(id: string, sig: string) {
  if (!validOptOut(id, sig)) reject("Keçid düzgün deyil.", 403);
  const r = await prisma.salesCampaignRecipient.findUnique({
    where: { id },
    select: { email: true },
  });
  if (r) await suppress(r.email, "Alıcı məktublardan imtina etdi");
  return { ok: true };
}

async function stopForDeal(
  r: { dealId: string | null; email: string; nextStep: number },
  campaignId: string,
) {
  if (
    await prisma.salesEmailSuppression.findUnique({ where: { email: r.email } })
  )
    return "Alıcı göndərişdən imtina edib";
  if (!r.dealId) return "Satış silinib";
  const d = await prisma.salesDeal.findUnique({
    where: { id: r.dealId },
    include: { client: { select: { email: true } } },
  });
  if (!d) return "Satış tapılmadı";
  if (email(d.email || d.client?.email) !== r.email)
    return "Müştərinin e-poçtu dəyişib; yenidən təsdiq tələb olunur";
  if (
    ["WON", "LOST", "NEGOTIATION"].includes(d.stage) ||
    stopStatuses.includes(d.proposalStatus || "") ||
    d.proposalResponse?.trim()
  )
    return "Satışda cavab, danışıqlar və ya nəticə qeydə alınıb";
  if (r.nextStep === 0 && ["SENT", "WAITING"].includes(d.proposalStatus || ""))
    return "Təklif artıq göndərilib";
  const c = await prisma.salesCampaign.findUnique({
    where: { id: campaignId },
    select: { approvedAt: true },
  });
  if (
    c?.approvedAt &&
    (await prisma.salesActivity.findFirst({
      where: {
        dealId: d.id,
        type: "MEETING",
        createdAt: { gte: c.approvedAt },
      },
    }))
  )
    return "Görüş qeydə alınıb";
  return "";
}

async function checkRecipientReply(id: string) {
  const r = await prisma.salesCampaignRecipient.findUnique({
    where: { id },
    include: {
      deliveries: { where: { state: "SENT" }, orderBy: { step: "asc" } },
    },
  });
  if (!r || !r.deliveries.length) return false;
  const result = await inspectReplies(
    r.email,
    r.deliveries[0].sentAt || r.deliveries[0].attemptedAt,
    r.deliveries.map((x) => x.messageId),
  );
  await prisma.salesCampaignRecipient.update({
    where: { id },
    data: { lastReplyCheckedAt: new Date() },
  });
  if (result.found) {
    const related = await prisma.salesCampaignRecipient.findMany({
      where: { email: r.email, state: { in: ["PENDING", "COMPLETED"] } },
    });
    for (const item of related)
      await stopRecipient(
        item.id,
        result.confirmed
          ? "Məktuba cavab alındı — əlaqə saxlayın"
          : "Alıcıdan məktub və ya avtomatik cavab gəldi — əl ilə yoxlayın",
        result.confirmed ? "REPLIED" : "REVIEW",
      );
    return true;
  }
  return false;
}
// One SMTP attempt per worker invocation. A durable global lease and unique
// recipient+step reservation prevent duplicate attempts on retries/crashes.
export async function runCampaigns() {
  const cfg = campaignConfig();
  if (!cfg.enabled) return { sent: 0, state: "DISABLED" };
  ready();
  const now = new Date(),
    leaseToken = randomUUID();
  await prisma.salesCampaignWorker.upsert({
    where: { id: "EMAIL" },
    create: {
      id: "EMAIL",
      leaseUntil: new Date(0),
      leaseToken: "",
      nextSendAt: new Date(0),
    },
    update: {},
  });
  const claimed = await prisma.salesCampaignWorker.updateMany({
    where: { id: "EMAIL", leaseUntil: { lt: now } },
    data: { leaseUntil: new Date(Date.now() + 180000), leaseToken },
  });
  if (!claimed.count) return { sent: 0, state: "BUSY" };
  try {
    await prisma.salesCampaignDelivery.updateMany({
      where: {
        state: "ATTEMPTING",
        attemptedAt: { lt: new Date(Date.now() - 180000) },
      },
      data: { state: "UNCERTAIN", errorCode: "INTERRUPTED" },
    });
    await prisma.salesCampaignRecipient.updateMany({
      where: {
        state: "SENDING",
        updatedAt: { lt: new Date(Date.now() - 180000) },
      },
      data: {
        state: "UNCERTAIN",
        stopReason: "Göndəriş yarımçıq qalıb; avtomatik təkrar edilməyəcək",
      },
    });
    const deadline = Date.now() + 40000;
    // Select one due recipient per campaign so a full daily quota in one
    // large campaign cannot hide every recipient in the other campaigns.
    const campaigns = await prisma.salesCampaign.findMany({
      where: {
        state: "ACTIVE",
        startsAt: { lte: now },
        recipients: { some: { state: "PENDING", nextAt: { lte: now } } },
      },
      orderBy: { startsAt: "asc" },
      take: 50,
      include: {
        recipients: {
          where: { state: "PENDING", nextAt: { lte: now } },
          orderBy: { nextAt: "asc" },
          take: 1,
        },
      },
    });
    const candidates = campaigns.flatMap((c) =>
      c.recipients.map((r) => ({ ...r, campaign: c })),
    );
    let sent = 0,
      checked = 0;
    for (const r of candidates) {
      if (Date.now() > deadline - 12000) break;
      const c = r.campaign;
      if (!inWindow(now, c)) continue;
      if (!(await activeAdmin(c.approvedByUserId || ""))) {
        await prisma.salesCampaign.update({
          where: { id: c.id },
          data: { state: "PAUSED" },
        });
        continue;
      }
      if (c.configHash !== cfg.configHash) {
        await prisma.salesCampaign.update({
          where: { id: c.id },
          data: { state: "PAUSED" },
        });
        continue;
      }
      const worker = await prisma.salesCampaignWorker.findUnique({
        where: { id: "EMAIL" },
      });
      const day = localDay(new Date());
      const globalCount = await prisma.salesCampaignDelivery.count({
        where: { attemptedAt: { gte: day } },
      });
      if (
        !worker ||
        worker.nextSendAt > new Date() ||
        globalCount >= cfg.globalLimit
      )
        break;
      const campaignCount = await prisma.salesCampaignDelivery.count({
        where: { attemptedAt: { gte: day }, recipient: { campaignId: c.id } },
      });
      if (campaignCount >= c.dailyLimit) continue;
      const reason = await stopForDeal(r, c.id);
      if (reason) {
        await stopRecipient(r.id, reason);
        continue;
      }
      // Every send, including the first, requires a working inbox connection.
      if (r.nextStep > 0) {
        if (await checkRecipientReply(r.id)) {
          checked++;
          continue;
        }
      } else {
        const pre = await inspectReplies(r.email, c.createdAt, []);
        if (pre.found) {
          await stopRecipient(
            r.id,
            "Yeni məktub var; əlaqəni yoxlayın",
            "REVIEW",
          );
          continue;
        }
      }
      const reservation = await dbtx(async (db) => {
        await lock(db);
        const fresh = await db.salesCampaignRecipient.findUnique({
            where: { id: r.id },
            include: { campaign: true },
          }),
          worker = await db.salesCampaignWorker.findUnique({
            where: { id: "EMAIL" },
          });
        if (
          !fresh ||
          fresh.state !== "PENDING" ||
          fresh.nextStep !== r.nextStep ||
          fresh.campaign.state !== "ACTIVE" ||
          worker?.leaseToken !== leaseToken ||
          worker.leaseUntil < new Date() ||
          worker.nextSendAt > new Date()
        )
          return null;
        if (
          await db.salesEmailSuppression.findUnique({
            where: { email: r.email },
          })
        )
          return null;
        const day = localDay(new Date());
        const [globalCount, campaignCount, old] = await Promise.all([
          db.salesCampaignDelivery.count({
            where: { attemptedAt: { gte: day } },
          }),
          db.salesCampaignDelivery.count({
            where: {
              attemptedAt: { gte: day },
              recipient: { campaignId: c.id },
            },
          }),
          db.salesCampaignDelivery.findUnique({
            where: {
              recipientId_step: { recipientId: r.id, step: r.nextStep },
            },
          }),
        ]);
        if (
          globalCount >= cfg.globalLimit ||
          campaignCount >= c.dailyLimit ||
          old
        )
          return null;
        const messageId = `<sales-${randomUUID()}@${cfg.sender.split("@")[1]}>`;
        const delivery = await db.salesCampaignDelivery.create({
          data: { recipientId: r.id, step: r.nextStep, messageId },
        });
        await db.salesCampaignRecipient.update({
          where: { id: r.id },
          data: { state: "SENDING" },
        });
        await db.salesCampaignWorker.update({
          where: { id: "EMAIL" },
          data: { nextSendAt: new Date(Date.now() + 60000) },
        });
        return delivery;
      });
      if (!reservation) continue;
      try {
        // Recheck the stop conditions immediately before contacting SMTP.
        const fresh = await prisma.salesCampaignRecipient.findUnique({
          where: { id: r.id },
          include: { campaign: true },
        });
        const stopped = await stopForDeal(r, c.id);
        if (
          !fresh ||
          fresh.state !== "SENDING" ||
          fresh.campaign.state !== "ACTIVE" ||
          !inWindow(new Date(), c) ||
          stopped
        ) {
          await prisma.salesCampaignDelivery.update({
            where: { id: reservation.id },
            data: { state: "CANCELLED" },
          });
          if (stopped) await stopRecipient(r.id, stopped);
          else if (fresh?.state === "SENDING")
            await stopRecipient(
              r.id,
              "Göndəriş başlamadan dayandırıldı; yenidən qaralama yaradın",
            );
          continue;
        }
        const sequence = c.steps as Step[],
          content = render(
            sequence[r.nextStep],
            r.fields as Record<string, string>,
            r.id,
          ),
          previous = await prisma.salesCampaignDelivery.findMany({
            where: { recipientId: r.id, state: "SENT" },
            orderBy: { step: "asc" },
          });
        const out = await sendMail({
          to: [r.email],
          fromAddress: cfg.sender,
          replyTo: cfg.replyTo,
          ...content,
          messageId: reservation.messageId,
          inReplyTo: previous.at(-1)?.messageId,
          references: previous.map((x) => x.messageId).join(" ") || undefined,
          headers: {
            "List-Unsubscribe": `<${cfg.origin}/api/sales/email-preferences?${new URLSearchParams({ id: r.id, sig: new URL(optOutURL(r.id)).searchParams.get("sig")! })}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        if (
          !out.accepted?.some(
            (x: any) =>
              email(typeof x === "string" ? x : x.address) === r.email,
          ) ||
          out.rejected?.length
        )
          throw Error("SMTP_REJECTED");
        await dbtx(async (db) => {
          await lock(db);
          const done = new Date(),
            nextStep = r.nextStep + 1;
          await db.salesCampaignDelivery.update({
            where: { id: reservation.id },
            data: { state: "SENT", sentAt: done },
          });
          await db.salesCampaignRecipient.updateMany({
            where: { id: r.id, state: "SENDING" },
            data: {
              state: nextStep < sequence.length ? "PENDING" : "COMPLETED",
              nextStep,
              lastSentAt: done,
              nextAt: new Date(
                done.getTime() +
                  (sequence[nextStep]?.afterDays || 0) * 86400000,
              ),
            },
          });
          const d = r.dealId
            ? await db.salesDeal.findUnique({ where: { id: r.dealId } })
            : null;
          if (d) {
            if (
              r.nextStep === 0 &&
              !stopStatuses.includes(d.proposalStatus || "") &&
              !["WON", "LOST"].includes(d.stage)
            )
              await db.salesDeal.update({
                where: { id: d.id },
                data: { proposalStatus: "SENT", proposalSentAt: done },
              });
            await db.salesActivity.create({
              data: {
                dealId: d.id,
                type: "EMAIL",
                text: `Kampaniya “${c.name}”: ${r.nextStep === 0 ? "təklif" : "xatırlatma"} SMTP tərəfindən qəbul edildi. Message-ID: ${reservation.messageId}`,
                createdByUserId: c.approvedByUserId,
                clientId: d.clientId,
                projectId: d.projectId,
              },
            });
          }
        });
        sent++;
      } catch (e) {
        const code = (e as any)?.code,
          known =
            ["EAUTH", "EENVELOPE"].includes(code) ||
            (e as Error).message === "SMTP_REJECTED";
        await prisma.salesCampaignDelivery.updateMany({
          where: { id: reservation.id, state: "ATTEMPTING" },
          data: {
            state: known ? "FAILED" : "UNCERTAIN",
            errorCode: known ? "SMTP_REJECTED" : "SMTP_RESULT_UNKNOWN",
          },
        });
        await prisma.salesCampaignRecipient.updateMany({
          where: { id: r.id, state: "SENDING" },
          data: {
            state: known ? "FAILED" : "UNCERTAIN",
            stopReason: known
              ? "SMTP göndərişi qəbul etmədi"
              : "Nəticə dəqiq deyil. Avtomatik təkrar göndərilmir; poçtu yoxlayın.",
          },
        });
      }
      break;
    }
    // Reply tracking also runs after the final reminder, and while a campaign is paused.
    if (!sent && Date.now() < deadline - 12000) {
      const r = await prisma.salesCampaignRecipient.findFirst({
        where: {
          state: { in: ["PENDING", "COMPLETED"] },
          lastSentAt: { gte: new Date(Date.now() - 90 * 86400000) },
          OR: [
            { lastReplyCheckedAt: null },
            { lastReplyCheckedAt: { lt: new Date(Date.now() - 60000) } },
          ],
        },
        orderBy: [
          { lastReplyCheckedAt: { sort: "asc", nulls: "first" } },
          { createdAt: "asc" },
        ],
      });
      if (r) {
        await checkRecipientReply(r.id);
        checked++;
      }
    }
    await prisma.salesCampaignWorker.updateMany({
      where: { id: "EMAIL", leaseToken },
      data: { lastCheckedAt: new Date(), lastError: null },
    });
    return { sent, checked, state: "OK" };
  } catch (e) {
    await prisma.salesCampaignWorker.updateMany({
      where: { id: "EMAIL", leaseToken },
      data: {
        lastError:
          "Poçt yoxlaması alınmadı. Göndəriş dayandırıldı; IMAP/SMTP və konfiqurasiyanı yoxlayın.",
      },
    });
    throw new CampaignError(
      503,
      "Poçt yoxlaması alınmadı. Məktub göndərilmədi və ya nəticəsi ayrıca yoxlanmalıdır.",
    );
  } finally {
    await prisma.salesCampaignWorker.updateMany({
      where: { id: "EMAIL", leaseToken },
      data: { leaseUntil: new Date(0) },
    });
  }
}
