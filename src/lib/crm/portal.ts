import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  tx,
  lock,
  permit,
  write,
  entry,
  hash,
  token,
  log,
  verified,
  type Context,
  type DB,
  type Actor,
} from "./db";
import { fail, required, state, str } from "./policy";
import { appOrigin, mailError } from "./mail";
export async function portalInvite(
  db: DB,
  c: Context,
  b: Record<string, unknown>,
) {
  permit(c, "customers", "update");
  write(c, "customers");
  const customer = await entry(db, c, required(b.customerId), "update");
  if (customer.kind !== "customers" || !customer.email)
    fail("Müştərinin e-poçtu olmalıdır.");
  if (b.revoke) {
    await db.crmPortalAccess.updateMany({
      where: { companyId: c.company.id, customerId: customer.id },
      data: { revokedAt: new Date() },
    });
    await log(
      db,
      c.company.id,
      c.user,
      "PORTAL_REVOKED",
      {},
      customer.id,
      Boolean(c.support),
    );
    return { ok: true };
  }
  const previous = await db.crmPortalAccess.findUnique({
    where: {
      companyId_customerId_email: {
        companyId: c.company.id,
        customerId: customer.id,
        email: customer.email,
      },
    },
  });
  if (previous && Date.now() - previous.createdAt.getTime() < 60000)
    fail("60 saniyə gözləyin.", 429);
  const raw = token(),
    value = {
      hash: hash(raw),
      expiresAt: new Date(Date.now() + 7 * 86400000),
      revokedAt: null,
      userId: null,
      acceptedAt: null,
      createdAt: new Date(),
    };
  const access = await db.crmPortalAccess.upsert({
    where: {
      companyId_customerId_email: {
        companyId: c.company.id,
        customerId: customer.id,
        email: customer.email,
      },
    },
    create: {
      ...value,
      companyId: c.company.id,
      customerId: customer.id,
      email: customer.email,
    },
    update: value,
  });
  await log(
    db,
    c.company.id,
    c.user,
    "PORTAL_INVITED",
    {},
    customer.id,
    Boolean(c.support),
  );
  return {
    delivery: { id: access.id, to: customer.email, name: c.company.name, raw },
  };
}
export async function deliverPortal(i: {
  id: string;
  to: string;
  name: string;
  raw: string;
}) {
  try {
    const link = new URL("/workspace/portal", appOrigin());
    link.searchParams.set("token", i.raw);
    await sendEmail({
      to: i.to,
      subject: i.name + " — şəxsi kabinet",
      text: `Sizin üçün şəxsi kabinet dəvəti var. E-poçtunuz təsdiqlənmiş New Era hesabı ilə daxil olub dəvəti qəbul edin. Link 7 gün etibarlıdır.\n${link}`,
    });
    return { ok: true, notice: "Kabinet dəvəti SMTP-yə təqdim edildi." };
  } catch (e) {
    return { ok: true, notice: mailError(e).message };
  }
}
export async function portal(
  u: Actor,
  b?: Record<string, unknown>,
  q = new URLSearchParams(),
) {
  verified(u);
  if (b?.action === "accept")
    return tx(async (db) => {
      const a =
        (await db.crmPortalAccess.findUnique({
          where: { hash: hash(required(b.token, 100)) },
        })) || fail("Dəvət tapılmadı.", 404);
      await lock(db, a.companyId);
      if (
        a.email !== u.email!.toLowerCase() ||
        a.revokedAt ||
        (!a.acceptedAt && a.expiresAt < new Date())
      )
        fail("Dəvət bu təsdiqlənmiş hesaba uyğun deyil.", 403);
      const customer = await db.crmEntry.findFirst({
        where: {
          companyId: a.companyId,
          id: a.customerId,
          kind: "customers",
          deletedAt: null,
          email: a.email,
        },
      });
      if (!customer) fail("Kabinet girişi artıq mövcud deyil.", 403);
      if (a.userId && a.userId !== u.id) fail("Dəvət istifadə edilib.", 409);
      await db.crmPortalAccess.update({
        where: { id: a.id },
        data: { userId: u.id, acceptedAt: new Date() },
      });
      await db.crmEvent.create({
        data: {
          companyId: a.companyId,
          type: "AUDIT",
          actorId: u.id,
          actorType: "CUSTOMER",
          entryId: a.customerId,
          data: { action: "PORTAL_ACCEPTED" },
        },
      });
      return { ok: true };
    });
  if (!q.get("accessId") && !b)
    return prisma.crmPortalAccess.findMany({
      where: {
        userId: u.id,
        email: u.email!.toLowerCase(),
        revokedAt: null,
        acceptedAt: { not: null },
        company: { state: { not: "SUSPENDED" } },
      },
      select: {
        id: true,
        company: { select: { name: true } },
        customerId: true,
      },
    });
  return tx(async (db) => {
    const a =
      (await db.crmPortalAccess.findFirst({
        where: {
          id: required(b?.accessId || q.get("accessId")),
          userId: u.id,
          email: u.email!.toLowerCase(),
          revokedAt: null,
          acceptedAt: { not: null },
        },
      })) || fail("Kabinetə giriş yoxdur.", 403);
    const company = await lock(db, a.companyId);
    if (state(company) === "SUSPENDED") fail("Şirkət dayandırılıb.", 403);
    const customer = await db.crmEntry.findFirst({
      where: {
        id: a.customerId,
        companyId: a.companyId,
        email: a.email,
        deletedAt: null,
      },
    });
    if (!customer) fail("Kabinetə giriş yoxdur.", 403);
    const publicWhere = {
      companyId: a.companyId,
      customerId: a.customerId,
      deletedAt: null,
      data: { path: ["portalVisible"], equals: true },
    };
    if (b) {
      if (!["TRIAL", "ACTIVE"].includes(state(company)))
        fail("Şirkətin abunəliyi aktiv deyil.", 402);
      if (b.action === "quote") {
        if (!company.features.includes("quotes"))
          fail("Təklif əməliyyatları hazırkı plana daxil deyil.", 403);
        const e =
          (await db.crmEntry.findFirst({
            where: {
              ...publicWhere,
              id: required(b.entryId),
              kind: "quotes",
              status: "SENT",
            },
          })) || fail("Təklif tapılmadı.", 404);
        if (e.version !== Number(b.version))
          fail(
            "Təklif yenilənib. Yeni şərtləri oxuyub yenidən təsdiqləyin.",
            409,
          );
        if (
          !["ACCEPTED", "REJECTED"].includes(String(b.status)) ||
          b.confirm !== true
        )
          fail("Qərarı təsdiqləyin.");
        await db.crmEntry.update({
          where: { id: e.id },
          data: { status: String(b.status), version: { increment: 1 } },
        });
        await db.crmEvent.create({
          data: {
            companyId: a.companyId,
            type: "AUDIT",
            entryId: e.id,
            actorId: u.id,
            actorType: "CUSTOMER",
            data: { action: "CUSTOMER_QUOTE_" + String(b.status) },
          },
        });
        return { ok: true };
      }
      if (b.action === "support") {
        if (
          await db.crmEvent.count({
            where: {
              companyId: a.companyId,
              type: "PORTAL_REQUEST",
              actorId: u.id,
              createdAt: { gt: new Date(Date.now() - 60000) },
            },
          })
        )
          fail("Bir dəqiqə gözləyin.", 429);
        return db.crmEvent.create({
          data: {
            companyId: a.companyId,
            type: "PORTAL_REQUEST",
            entryId: a.customerId,
            actorId: u.id,
            actorType: "CUSTOMER",
            data: { message: required(b.message, 4000), status: "OPEN" },
          },
        });
      }
      fail("Əməliyyat uyğun deyil.");
    }
    const records = await db.crmEntry.findMany({
      where: {
        ...publicWhere,
        kind: { in: ["sales", "quotes", "payments", "tasks", "calendar"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 300,
      select: {
        id: true,
        title: true,
        kind: true,
        status: true,
        amount: true,
        currency: true,
        dueAt: true,
        updatedAt: true,
        version: true,
        data: true,
      },
    });
    const files = await db.crmAttachment.findMany({
      where: {
        companyId: company.id,
        portalVisible: true,
        entryId: { in: records.map((e) => e.id) },
      },
      select: { id: true, name: true, size: true, entryId: true },
    });
    return {
      files,
      company: { name: company.name },
      customer: { title: customer.title },
      records: records.map((e) => ({
        ...e,
        data:
          e.kind === "quotes"
            ? {
                lines: (e.data as Record<string, unknown>).lines,
                discount: (e.data as Record<string, unknown>).discount,
              }
            : {},
      })),
      requests: await db.crmEvent.findMany({
        where: {
          companyId: a.companyId,
          type: "PORTAL_REQUEST",
          entryId: a.customerId,
          actorId: u.id,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    };
  });
}
export async function portalFile(
  u: Actor,
  q: URLSearchParams,
  upload?: { bytes: Buffer; name: string; mime: string },
) {
  verified(u);
  return tx(async (db) => {
    const a =
      (await db.crmPortalAccess.findFirst({
        where: {
          id: required(q.get("accessId")),
          userId: u.id,
          email: u.email!.toLowerCase(),
          revokedAt: null,
          acceptedAt: { not: null },
        },
      })) || fail("Kabinetə giriş yoxdur.", 403);
    const company = await lock(db, a.companyId);
    if (state(company) === "SUSPENDED") fail("Şirkət dayandırılıb.", 403);
    const customer = await db.crmEntry.findFirst({
      where: {
        id: a.customerId,
        companyId: a.companyId,
        email: a.email,
        deletedAt: null,
      },
    });
    if (!customer) fail("Kabinetə giriş yoxdur.", 403);
    const owned = {
      companyId: a.companyId,
      customerId: a.customerId,
      deletedAt: null,
      data: { path: ["portalVisible"], equals: true },
    };
    if (upload) {
      if (!["TRIAL", "ACTIVE"].includes(state(company)))
        fail("Abunəlik aktiv deyil.", 402);
      const e =
        (await db.crmEntry.findFirst({
          where: { ...owned, id: required(q.get("entryId")) },
        })) || fail("Paylaşılmış qeyd tapılmadı.", 404);
      const { validateFile } = await import("./files");
      validateFile(upload.bytes, upload.mime);
      const used =
        (
          await db.crmAttachment.aggregate({
            where: { companyId: company.id },
            _sum: { size: true },
          })
        )._sum.size || 0;
      if (used + upload.bytes.length > company.bytes)
        fail("Yaddaş limiti dolub.", 409);
      const file = await db.crmAttachment.create({
        data: {
          companyId: company.id,
          entryId: e.id,
          name: required(upload.name, 180).replace(/[\x00-\x1f/\\]/g, "_"),
          mime: upload.mime,
          portalVisible: true,
          size: upload.bytes.length,
          bytes: upload.bytes,
        },
        select: { id: true, name: true, size: true },
      });
      await db.crmEvent.create({
        data: {
          companyId: company.id,
          entryId: e.id,
          type: "AUDIT",
          actorId: u.id,
          actorType: "CUSTOMER",
          data: { action: "CUSTOMER_FILE_UPLOADED", fileId: file.id },
        },
      });
      return { file: null, created: file };
    }
    const f =
      (await db.crmAttachment.findFirst({
        where: {
          id: required(q.get("fileId")),
          companyId: company.id,
          portalVisible: true,
          entry: { ...owned },
        },
      })) || fail("Fayl tapılmadı.", 404);
    return { file: f, created: null };
  });
}
