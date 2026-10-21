import { randomInt, randomUUID } from "node:crypto";
import { Prisma, type SalesOffer } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { email } from "./campaign-policy";
import { sendMail, smtpConfigured } from "@/lib/mail/smtp";
import {
  validateOffer,
  tokenFor,
  linkFor,
  sha,
  equal,
  otpHash,
  key,
  reject,
  responseInput,
  maskEmail,
} from "./offer-policy";

const tx = <T>(f: (db: Prisma.TransactionClient) => Promise<T>) =>
  prisma.$transaction(f, { timeout: 15000 });
// Shared with the campaign worker so a response cannot race its next send reservation.
async function lock(db: Prisma.TransactionClient) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(73021109)`;
}
const editableResponses = ["OPEN", "CHANGES_REQUESTED", "MEETING_REQUESTED"];
const liveResponses = [...editableResponses, "ACCEPTED", "DECLINED"];
const fieldNames = [
  "recipientEmail",
  "recipientName",
  "company",
  "title",
  "introduction",
  "services",
  "currency",
  "discountMinor",
  "totalMinor",
  "terms",
  "expiresAt",
] as const;
async function log(
  db: Prisma.TransactionClient,
  id: string,
  type: string,
  actorId: string | null,
  details?: string,
) {
  await db.salesOfferEvent.create({
    data: { offerId: id, type, actorId, details },
  });
}
async function activity(
  db: Prisma.TransactionClient,
  p: SalesOffer,
  text: string,
  actorId: string | null = null,
  type: "PROPOSAL" | "FOLLOW_UP" = "PROPOSAL",
) {
  if (p.dealId)
    await db.salesActivity.create({
      data: {
        dealId: p.dealId,
        type,
        text,
        createdByUserId: actorId,
        dueAt: type === "FOLLOW_UP" ? new Date() : null,
      },
    });
}
function adminDto(p: SalesOffer) {
  return { ...p, tokenHash: undefined };
}
function publicDto(p: SalesOffer) {
  return {
    id: p.id,
    version: p.version,
    state: p.state,
    recipientName: p.recipientName,
    company: p.company,
    title: p.title,
    introduction: p.introduction,
    services: p.services,
    currency: p.currency,
    discountMinor: p.discountMinor,
    totalMinor: p.totalMinor,
    terms: p.terms,
    expiresAt: p.expiresAt,
    acceptedAt: p.acceptedAt,
    responseAt: p.responseAt,
    responseMessage: p.responseMessage,
    emailHint: p.recipientEmail ? maskEmail(p.recipientEmail) : undefined,
    responseEnabled: Boolean(email(p.recipientEmail)),
  };
}
async function visible(
  db: Prisma.TransactionClient,
  id: string,
  token: unknown,
) {
  if (
    !/^[a-zA-Z0-9-]{10,80}$/.test(id) ||
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/.test(token)
  )
    reject("Təklif linki etibarsızdır.", 404);
  const p = await db.salesOffer.findUnique({ where: { id } });
  if (
    !p ||
    !p.tokenHash ||
    !equal(p.tokenHash, sha(token)) ||
    !equal(tokenFor(id), token) ||
    !liveResponses.includes(p.state)
  )
    reject("Təklif tapılmadı və ya link bağlanıb.", 404);
  if (p.expiresAt.getTime() <= Date.now())
    reject(
      "Təklifin etibarlılıq müddəti bitib. Yeni təklif üçün əlaqə saxlayın.",
      410,
    );
  return p;
}
function canRespond(p: SalesOffer) {
  if (!email(p.recipientEmail))
    reject("Bu təklif yalnız baxış üçündür. Cavabınızı təklifi göndərən NEW ERA nümayəndəsinə bildirin.", 409);
  if (!editableResponses.includes(p.state))
    reject("Bu təklif üzrə yekun cavab artıq qeydə alınıb.", 409);
}
function review(p: SalesOffer) {
  return sha(
    JSON.stringify(fieldNames.map((k) => p[k])) +
      ":" +
      p.updatedAt.toISOString(),
  );
}
export async function offerList(page = 1) {
  const [items, total] = await Promise.all([
    prisma.salesOffer.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 30,
      take: 30,
    }),
    prisma.salesOffer.count(),
  ]);
  return {
    items: items.map(adminDto),
    total,
    page,
    mailReady: smtpConfigured(),
  };
}
export async function offerDetail(id: string) {
  const p = await prisma.salesOffer.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: "desc" }, take: 100 } },
  });
  if (!p) reject("Təklif tapılmadı.", 404);
  const versions = await prisma.salesOffer.findMany({
    where: { groupId: p.groupId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      state: true,
      totalMinor: true,
      currency: true,
      createdAt: true,
    },
  });
  return {
    offer: { ...adminDto(p), events: p.events },
    versions,
    review: review(p),
    link: liveResponses.includes(p.state) ? linkFor(id) : null,
  };
}
export async function saveOffer(userId: string, b: any) {
  const data = validateOffer(b);
  return tx(async (db) => {
    await lock(db);
    if (b.id) {
      const old = await db.salesOffer.findUnique({
        where: { id: String(b.id) },
      });
      if (!old || old.state !== "DRAFT")
        reject("Yalnız qaralama redaktə edilə bilər.", 409);
      if (b.updatedAt !== old.updatedAt.toISOString())
        reject("Qaralama dəyişib. Yeniləyin.", 409);
      const p = await db.salesOffer.update({
        where: { id: old.id },
        data: { ...data, services: data.services as any },
      });
      await log(db, p.id, "DRAFT_UPDATED", userId);
      return { offer: adminDto(p), review: review(p) };
    }
    const deal = await db.salesDeal.findUnique({
      where: { id: String(b.dealId || "") },
    });
    if (!deal) reject("Mövcud satışı seçin.");
    const last = await db.salesOffer.findFirst({
      where: { groupId: deal.id },
      orderBy: { version: "desc" },
    });
    if (last?.state === "DRAFT")
      reject("Bu satışın qaralaması artıq var. Siyahıdan açın.", 409);
    if (last?.state === "ACCEPTED")
      reject(
        "Qəbul olunmuş təklif dəyişmir. Yeni iş üçün ayrıca satış yaradın.",
        409,
      );
    const p = await db.salesOffer.create({
      data: {
        ...data,
        services: data.services as any,
        dealId: deal.id,
        groupId: deal.id,
        version: (last?.version || 0) + 1,
        createdByUserId: userId,
      },
    });
    await log(db, p.id, "DRAFT_CREATED", userId);
    return { offer: adminDto(p), review: review(p) };
  });
}
export async function publishOffer(userId: string, b: any) {
  if (b.confirm !== true) reject("Yayımlanmanı ayrıca təsdiqləyin.");
  key();
  // Validate canonical URL before committing an irreversible published version.
  linkFor(String(b.id));
  return tx(async (db) => {
    await lock(db);
    const p = await db.salesOffer.findUnique({ where: { id: String(b.id) } });
    if (!p || p.state !== "DRAFT")
      reject("Yalnız qaralamanı yayımlamaq olar.", 409);
    if (email(p.recipientEmail) && !smtpConfigured())
      reject("Müştərinin təsdiq kodu üçün e-poçt bağlantısını qurun.", 503);
    if (b.review !== review(p))
      reject("Təklif dəyişib. Məzmunu yenidən yoxlayın.", 409);
    if (p.expiresAt.getTime() <= Date.now())
      reject("Etibarlılıq tarixini yeniləyin.");
    const current = await db.salesOffer.findMany({
      where: {
        groupId: p.groupId,
        id: { not: p.id },
        state: { in: liveResponses },
      },
    });
    if (current.some((x) => x.state === "ACCEPTED"))
      reject("Əvvəlki versiya artıq qəbul edilib.", 409);
    for (const old of current) {
      await db.salesOffer.update({
        where: { id: old.id },
        data: { state: "SUPERSEDED", tokenHash: null },
      });
      await log(db, old.id, "SUPERSEDED", userId, `Yeni versiya: ${p.version}`);
    }
    await db.salesOfferChallenge.updateMany({
      where: { offer: { groupId: p.groupId }, usedAt: null },
      data: { state: "INVALIDATED" },
    });
    const next = await db.salesOffer.update({
      where: { id: p.id },
      data: {
        state: "OPEN",
        publishedAt: new Date(),
        tokenHash: sha(tokenFor(p.id)),
      },
    });
    await log(db, p.id, "PUBLISHED", userId);
    await activity(
      db,
      next,
      `Onlayn təklif yayımlandı: ${p.title} · v${p.version}. Məktub hələ göndərilməyib.`,
      userId,
    );
    return { offer: adminDto(next), link: linkFor(p.id) };
  });
}
export async function revokeOffer(userId: string, b: any) {
  if (b.confirm !== true) reject("Linkin bağlanmasını təsdiqləyin.");
  return tx(async (db) => {
    await lock(db);
    const p = await db.salesOffer.findUnique({ where: { id: String(b.id) } });
    if (!p || p.state === "ACCEPTED")
      reject("Qəbul edilmiş təklif bağlana bilməz.", 409);
    if (["REVOKED", "SUPERSEDED"].includes(p.state)) return { ok: true };
    await db.salesOffer.update({
      where: { id: p.id },
      data: { state: "REVOKED", tokenHash: null },
    });
    await db.salesOfferChallenge.updateMany({
      where: { offerId: p.id, usedAt: null },
      data: { state: "INVALIDATED" },
    });
    await log(db, p.id, "REVOKED", userId);
    return { ok: true };
  });
}
export async function sendOffer(userId: string, b: any) {
  if (b.confirm !== true)
    reject("Müştəriyə məktub göndərilməsini təsdiqləyin.");
  if (!smtpConfigured()) reject("E-poçt bağlantısı qurulmayıb.", 503);
  const p = await tx(async (db) => {
    await lock(db);
    const p = await db.salesOffer.findUnique({ where: { id: String(b.id) } });
    if (
      !p ||
      !editableResponses.includes(p.state) ||
      p.expiresAt.getTime() <= Date.now()
    )
      reject("Aktiv yayımlanmış təklif seçin.", 409);
    if (!email(p.recipientEmail))
      reject("Bu təklifdə müştərinin e-poçtu yoxdur. Linki kopyalayıb paylaşın.", 409);
    if (["SENDING", "UNCERTAIN", "SENT"].includes(p.mailState))
      reject(
        "Bu təklif üçün göndəriş artıq başlanıb. Yenidən avtomatik göndərilmir; linki kopyalaya bilərsiniz.",
        409,
      );
    const quota = await db.salesOfferEvent.count({
      where: {
        type: "EMAIL_ATTEMPT",
        createdAt: { gte: new Date(Date.now() - 3600000) },
      },
    });
    if (quota >= 30) reject("Saatlıq 30 göndəriş limitinə çatılıb.", 429);
    const to = await db.salesOffer.update({
      where: { id: p.id },
      data: { mailState: "SENDING", mailAttemptAt: new Date() },
    });
    await log(db, p.id, "EMAIL_ATTEMPT", userId);
    return to;
  });
  try {
    const result = await sendMail({
      to: [p.recipientEmail],
      subject: `New Era — ${p.title}`,
      text: `Salam, ${p.recipientName}.\n\nSizin üçün hazırladığımız xidmətlər, qiymətlər və şərtlərlə tanış olun:\n${linkFor(p.id)}\n\nTəklifin etibarlılıq tarixi: ${p.expiresAt.toLocaleDateString("az-AZ", { timeZone: "Asia/Baku" })}.\nBaxmaq üçün qeydiyyat tələb olunmur. Qəbul e-poçt kodu ilə təsdiqlənir.\n\nNew Era komandası`,
    });
    if (
      !result.accepted?.some(
        (x: any) =>
          String(typeof x === "string" ? x : x.address).toLowerCase() ===
          p.recipientEmail,
      )
    )
      throw Object.assign(Error("REJECTED"), { code: "EENVELOPE" });
    await tx(async (db) => {
      await lock(db);
      await db.salesOffer.update({
        where: { id: p.id },
        data: { mailState: "SENT", sentAt: new Date() },
      });
      await log(db, p.id, "EMAIL_SMTP_ACCEPTED", userId);
      await activity(
        db,
        p,
        `Onlayn təklif məktubunu SMTP qəbul etdi: ${p.title} · v${p.version}`,
        userId,
      );
      if (p.dealId)
        await db.salesDeal.updateMany({
          where: {
            id: p.dealId,
            OR: [
              { proposalStatus: null },
              {
                proposalStatus: {
                  notIn: [
                    "ACCEPTED",
                    "DECLINED",
                    "RESPONDED",
                    "REVISED",
                    "MEETING",
                  ],
                },
              },
            ],
          },
          data: { proposalStatus: "SENT", proposalSentAt: new Date() },
        });
    });
    return { ok: true };
  } catch (e) {
    const failed = ["EAUTH", "EENVELOPE"].includes(String((e as any)?.code));
    await prisma.salesOffer
      .updateMany({
        where: { id: p.id, mailState: "SENDING" },
        data: { mailState: failed ? "FAILED" : "UNCERTAIN" },
      })
      .catch(() => {});
    reject(
      failed
        ? "Məktub qəbul edilmədi. Poçt bağlantısını yoxlayın."
        : "Göndərişin nəticəsi qeyri-müəyyəndir. Poçtda yoxlayın; avtomatik təkrar göndərilmir.",
      503,
    );
  }
}
export async function viewOffer(id: string, token: unknown, track = false) {
  return tx(async (db) => {
    if (track) await lock(db);
    const p = await visible(db, id, token);
    if (
      track &&
      (!p.lastViewedAt || p.lastViewedAt.getTime() < Date.now() - 60000)
    ) {
      await db.salesOffer.update({
        where: { id },
        data: {
          firstViewedAt: p.firstViewedAt || new Date(),
          lastViewedAt: new Date(),
        },
      });
      if (!p.firstViewedAt)
        await log(
          db,
          id,
          "LINK_VIEWED",
          null,
          "Link açılıb; bu hadisə insanın oxuduğunu sübut etmir.",
        );
    }
    return { offer: publicDto(p) };
  });
}
export async function requestOfferCode(id: string, b: any) {
  const { action, message } = responseInput(b);
  key();
  if (!smtpConfigured()) reject("Təsdiq kodu hazırda göndərilə bilmir.", 503);
  const challengeId = randomUUID(),
    code = String(randomInt(100000, 1000000));
  const p = await tx(async (db) => {
    await lock(db);
    const p = await visible(db, id, b.token);
    canRespond(p);
    const recent = await db.salesOfferChallenge.findFirst({
      where: { email: p.recipientEmail },
      orderBy: { createdAt: "desc" },
    });
    if (recent && recent.createdAt.getTime() > Date.now() - 60000)
      reject("Yeni kodu 60 saniyədən sonra istəyin.", 429);
    const [hour, day, global] = await Promise.all([
      db.salesOfferChallenge.count({
        where: {
          email: p.recipientEmail,
          createdAt: { gte: new Date(Date.now() - 3600000) },
        },
      }),
      db.salesOfferChallenge.count({
        where: {
          email: p.recipientEmail,
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
      }),
      db.salesOfferChallenge.count({
        where: { createdAt: { gte: new Date(Date.now() - 3600000) } },
      }),
    ]);
    if (hour >= 3 || day >= 10 || global >= 100)
      reject("Kod sorğusu limiti dolub. Daha sonra yenidən cəhd edin.", 429);
    await db.salesOfferChallenge.updateMany({
      where: { offerId: id, usedAt: null },
      data: { state: "INVALIDATED" },
    });
    await db.salesOfferChallenge.create({
      data: {
        id: challengeId,
        offerId: id,
        email: p.recipientEmail,
        action,
        message,
        codeHash: otpHash(challengeId, code),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
    return p;
  });
  try {
    const result = await sendMail({
      to: [p.recipientEmail],
      subject: "New Era — Təklif üzrə təsdiq kodu",
      text: `Salam, ${p.recipientName}.\n\n“${p.title}” (v${p.version}) üzrə ${action === "ACCEPT" ? "təklifi qəbul etmək" : action === "DECLINE" ? "təklifdən imtina etmək" : action === "CHANGE" ? "dəyişiklik istəmək" : "görüş sorğusu göndərmək"} üçün təsdiq kodunuz:\n\n${code}\n\nKod 10 dəqiqə etibarlıdır. Bu əməliyyatı siz başlamamısınızsa, kodu paylaşmayın və məktuba məhəl qoymayın.\n\nNew Era komandası`,
    });
    if (
      !result.accepted?.some(
        (x: any) =>
          String(typeof x === "string" ? x : x.address).toLowerCase() ===
          p.recipientEmail,
      )
    )
      throw Error("REJECTED");
    const ready = await prisma.salesOfferChallenge.updateMany({
      where: { id: challengeId, state: "SENDING" },
      data: { state: "READY" },
    });
    if (!ready.count)
      reject("Sorğu yenilənib. Yeni təklif linkindən istifadə edin.", 409);
  } catch {
    await prisma.salesOfferChallenge
      .updateMany({
        where: { id: challengeId, state: "SENDING" },
        data: { state: "FAILED" },
      })
      .catch(() => {});
    reject(
      "Təsdiq kodunu göndərmək mümkün olmadı. Bir qədər sonra yenidən cəhd edin.",
      503,
    );
  }
  return {
    challengeId,
    emailHint: maskEmail(p.recipientEmail),
    expiresIn: 600,
  };
}
export async function confirmOfferCode(id: string, b: any) {
  if (
    typeof b.code !== "string" ||
    !/^\d{6}$/.test(b.code) ||
    typeof b.challengeId !== "string" ||
    b.challengeId.length > 80
  )
    reject("Altırəqəmli kodu daxil edin.");
  const result = await tx(async (db) => {
    await lock(db);
    const p = await visible(db, id, b.token);
    if (!email(p.recipientEmail))
      reject("Bu təklif yalnız baxış üçündür.", 409);
    const c = await db.salesOfferChallenge.findUnique({
      where: { id: b.challengeId },
    });
    if (
      !c ||
      c.offerId !== id ||
      c.email !== p.recipientEmail ||
      c.expiresAt.getTime() <= Date.now() ||
      !["READY", "USED"].includes(c.state) ||
      c.attempts >= 5
    )
      return { error: "Kod etibarsızdır, müddəti və ya cəhd limiti bitib." };
    if (!equal(c.codeHash, otpHash(c.id, b.code))) {
      await db.salesOfferChallenge.update({
        where: { id: c.id },
        data: { attempts: { increment: 1 } },
      });
      return { error: "Kod düzgün deyil." };
    }
    if (c.usedAt) return { ok: true, state: p.state };
    canRespond(p);
    const state =
        c.action === "ACCEPT"
          ? "ACCEPTED"
          : c.action === "DECLINE"
            ? "DECLINED"
            : c.action === "CHANGE"
              ? "CHANGES_REQUESTED"
              : "MEETING_REQUESTED",
      now = new Date();
    await db.salesOfferChallenge.update({
      where: { id: c.id },
      data: { state: "USED", usedAt: now },
    });
    await db.salesOfferChallenge.updateMany({
      where: { offerId: id, id: { not: c.id }, usedAt: null },
      data: { state: "INVALIDATED" },
    });
    const next = await db.salesOffer.update({
      where: { id },
      data: {
        state,
        responseAt: now,
        responseMessage: c.message,
        acceptedAt: c.action === "ACCEPT" ? now : null,
      },
    });
    await log(
      db,
      id,
      state,
      null,
      `E-poçt kodu ilə təsdiq: ${p.recipientEmail}${c.message ? " · " + c.message : ""}`,
    );
    await activity(
      db,
      next,
      `Müştəri e-poçt kodu ilə təsdiqlədi: ${state} · ${p.title} · v${p.version}${c.message ? "\n" + c.message : ""}`,
      null,
      c.action === "CHANGE" || c.action === "MEETING"
        ? "FOLLOW_UP"
        : "PROPOSAL",
    );
    if (p.dealId)
      await db.salesDeal.update({
        where: { id: p.dealId },
        data: {
          proposalStatus:
            c.action === "ACCEPT"
              ? "ACCEPTED"
              : c.action === "DECLINE"
                ? "DECLINED"
                : c.action === "CHANGE"
                  ? "REVISED"
                  : "MEETING",
          proposalResponse: c.message || state,
          revisionStatus: c.action === "CHANGE" ? "REQUESTED" : undefined,
        },
      });
    // Stop pending campaign messages for this customer; never send a reminder after a confirmed response.
    const recipients = await db.salesCampaignRecipient.findMany({
      where: { email: p.recipientEmail, state: { in: ["PENDING", "SENDING"] } },
      select: { id: true },
    });
    if (recipients.length) {
      await db.salesCampaignRecipient.updateMany({
        where: { id: { in: recipients.map((x) => x.id) } },
        data: { state: "STOPPED", stopReason: `ONLINE_OFFER_${state}` },
      });
    }
    return { ok: true, state };
  });
  if ("error" in result) reject(result.error!, 400);
  return result;
}
