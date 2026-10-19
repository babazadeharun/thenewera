import { appOrigin, mailError } from "./mail";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  monthEnd,
  fail,
  required,
  str,
  state,
  roles,
  grants,
  grant,
} from "./policy";
import {
  tx,
  verified,
  initialPlan,
  log,
  lock,
  hash,
  token,
  permit,
  write,
  seat,
  publicSeat,
  publicInvite,
  type Actor,
  type DB,
  type Context,
} from "./db";
export async function home(u: Actor) {
  verified(u);
  return {
    email: u.email,
    memberships: (
      await prisma.crmSeat.findMany({
        where: { userId: u.id, active: true },
        include: { company: true },
        orderBy: { createdAt: "asc" },
      })
    ).map((m) => ({
      id: m.id,
      role: m.role,
      company: {
        id: m.company.id,
        name: m.company.name,
        state: state(m.company),
      },
    })),
    invites: await prisma.crmInvitation.findMany({
      where: {
        email: u.email!.toLowerCase(),
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        role: true,
        company: { select: { name: true } },
        expiresAt: true,
      },
    }),
  };
}
export async function create(u: Actor, b: Record<string, unknown>) {
  verified(u);
  return tx(async (db) => {
    const plan = await initialPlan(db),
      now = new Date();
    const email = required(b.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("E-poçt düzgün deyil.");
    const w = await db.crmCompany.create({
      data: {
        name: required(b.name),
        industry: required(b.industry),
        email,
        phone: required(b.phone, 40),
        taxId: str(b.taxId, 30) || null,
        planId: plan.id,
        seats: plan.seats,
        bytes: plan.bytes,
        records: plan.records,
        features: plan.features,
        trialStart: now,
        trialEnd: monthEnd(now),
        members: { create: { userId: u.id, role: "OWNER" } },
      },
    });
    await log(db, w.id, u, "WORKSPACE_CREATED", {
      trialEnd: w.trialEnd.toISOString(),
    });
    return { id: w.id };
  });
}
export async function accept(u: Actor, b: Record<string, unknown>) {
  verified(u);
  return tx(async (db) => {
    const before =
      (await db.crmInvitation.findUnique({
        where: b.token
          ? { hash: hash(required(b.token, 100)) }
          : { id: required(b.id) },
      })) || fail("Dəvət tapılmadı.", 404);
    const company = await lock(db, before.companyId),
      i = (await db.crmInvitation.findUnique({ where: { id: before.id } }))!;
    if (i.email !== u.email!.toLowerCase())
      fail("Dəvət başqa təsdiqlənmiş e-poçta aiddir.", 403);
    const existing = await db.crmSeat.findUnique({
      where: { companyId_userId: { companyId: company.id, userId: u.id } },
    });
    if (existing && !existing.active)
      fail("Girişi şirkət rəhbəri bərpa etməlidir.", 403);
    if (i.acceptedAt && existing) return { id: company.id };
    if (i.acceptedAt || i.revokedAt || i.expiresAt <= new Date())
      fail("Dəvət etibarlı deyil.", 410);
    if (!["TRIAL", "ACTIVE"].includes(state(company)))
      fail("Şirkət rəhbəri abunəliyi aktivləşdirməlidir.", 402);
    if (!existing) {
      if (
        (await db.crmSeat.count({
          where: { companyId: company.id, active: true },
        })) >= company.seats
      )
        fail("İstifadəçi limiti dolub.", 409);
      await db.crmSeat.create({
        data: {
          companyId: company.id,
          userId: u.id,
          role: i.role,
          team: i.team,
        },
      });
    }
    await db.crmInvitation.update({
      where: { id: i.id },
      data: { acceptedAt: new Date() },
    });
    await log(db, company.id, u, "INVITE_ACCEPTED", { id: i.id });
    return { id: company.id };
  });
}
export async function invite(db: DB, c: Context, b: Record<string, unknown>) {
  permit(c, "team", "create");
  write(c);
  const role = required(b.role) as (typeof roles)[number];
  if (!roles.includes(role) || role === "OWNER")
    fail("Dəvət rolu düzgün deyil.");
  if (c.member?.role !== "OWNER" && !c.support) {
    const ranks = { NONE: 0, OWN: 1, TEAM: 2, ALL: 3 };
    for (const module of [
      "customers",
      "sales",
      "tasks",
      "calendar",
      "quotes",
      "payments",
      "messages",
      "reports",
      "automation",
      "team",
      "settings",
      "billing",
    ])
      for (const op of [
        "read",
        "create",
        "update",
        "delete",
        "export",
      ] as const)
        if (
          ranks[grant(role, module, op)] >
          ranks[grant(c.member!.role, module, op, c.member!.grants)]
        )
          fail(
            "Öz icazələrinizdən geniş səlahiyyətli rol dəvət edə bilməzsiniz.",
            403,
          );
  }
  const email = required(b.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("E-poçt düzgün deyil.");
  if (
    await db.crmSeat.findFirst({
      where: {
        companyId: c.company.id,
        user: { email: { equals: email, mode: "insensitive" } },
      },
    })
  )
    fail(
      "Əməkdaş artıq komandadadır. Girişini Komanda bölməsində idarə edin.",
      409,
    );
  if (
    await db.crmInvitation.count({
      where: {
        companyId: c.company.id,
        email,
        createdAt: { gt: new Date(Date.now() - 60000) },
      },
    })
  )
    fail("60 saniyə gözləyin.", 429);
  const count = await db.crmSeat.count({
      where: { companyId: c.company.id, active: true },
    }),
    pending = await db.crmInvitation.count({
      where: {
        companyId: c.company.id,
        email: { not: email },
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  if (count + pending >= c.company.seats) fail("Komanda limiti dolub.", 409);
  await db.crmInvitation.updateMany({
    where: {
      companyId: c.company.id,
      email,
      acceptedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
  const raw = token(),
    i = await db.crmInvitation.create({
      data: {
        companyId: c.company.id,
        email,
        role,
        team: str(b.team, 80) || null,
        hash: hash(raw),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
  await log(
    db,
    c.company.id,
    c.user,
    "INVITE_CREATED",
    { id: i.id, email, role },
    undefined,
    Boolean(c.support),
  );
  return { id: i.id, email, name: c.company.name, token: raw };
}
export async function deliver(i: Awaited<ReturnType<typeof invite>>) {
  let submitted = false;
  try {
    const link = new URL("/workspace/invite", appOrigin());
    link.searchParams.set("token", i.token);
    const receipt = await sendEmail({
      to: i.email,
      subject: `${i.name} — Workspace dəvəti`,
      text: `${i.name} komandasına dəvət olunmusunuz. Dəvət göndərilən e-poçtla mövcud New Era hesabınıza daxil olun və ayrıca qəbul edin. Link 7 gün etibarlıdır.\n${link}`,
    });
    if (
      receipt &&
      typeof receipt === "object" &&
      Array.isArray(receipt.rejected) &&
      receipt.rejected.length &&
      (!Array.isArray(receipt.accepted) || !receipt.accepted.length)
    )
      throw Object.assign(new Error("REJECTED"), { code: "REJECTED" });
    submitted = true;
    await prisma.crmInvitation.updateMany({
      where: { id: i.id, revokedAt: null },
      data: { sentAt: new Date(), error: null },
    });
    await prisma.crmEvent.create({
      data: {
        companyId: (
          await prisma.crmInvitation.findUniqueOrThrow({
            where: { id: i.id },
            select: { companyId: true },
          })
        ).companyId,
        type: "INVITE_DELIVERY",
        entryId: i.id,
        data: { state: "SMTP_ACCEPTED" },
      },
    });
    return {
      ok: true,
      notice:
        "Dəvət məktubu SMTP tərəfindən qəbul edildi. Əməkdaş inbox və spam qovluğunu yoxlaya bilər.",
    };
  } catch (error) {
    const detail = mailError(error);
    console.error("CRM_INVITE_DELIVERY", {
      invitationId: i.id,
      code: detail.code,
      responseCode: detail.responseCode,
      submitted,
    });
    const message = submitted
      ? "Məktub SMTP-yə verildi, amma status yadda saxlanmadı. Təkrar göndərməzdən əvvəl alıcı poçtunu yoxlayın."
      : detail.message + " [" + detail.code + "]";
    await prisma.crmInvitation
      .updateMany({ where: { id: i.id }, data: { error: message } })
      .catch(() => undefined);
    return { ok: true, notice: message };
  }
}
export async function team(db: DB, c: Context) {
  permit(c, "team", "read");
  return {
    members: await db.crmSeat.findMany({
      where: { companyId: c.company.id },
      select: publicSeat,
    }),
    invites: await db.crmInvitation.findMany({
      where: { companyId: c.company.id },
      select: publicInvite,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  };
}
export async function changeMember(
  db: DB,
  c: Context,
  b: Record<string, unknown>,
) {
  permit(c, "team", "update");
  write(c);
  if (c.member?.role !== "OWNER" && !c.support)
    fail("Rol və fərdi icazələri yalnız Owner dəyişə bilər.", 403);
  const m =
    (await db.crmSeat.findFirst({
      where: { id: required(b.id), companyId: c.company.id },
      include: { user: { select: { email: true } } },
    })) || fail("Üzv tapılmadı.", 404);
  if (m.role === "OWNER" || b.role === "OWNER")
    fail("Sahiblik ayrıca təsdiqlənmiş əməliyyatla ötürülür.", 409);
  if (!roles.includes(b.role as (typeof roles)[number]))
    fail("Rol düzgün deyil.");
  if (
    b.active === true &&
    !m.active &&
    (await db.crmSeat.count({
      where: { companyId: c.company.id, active: true },
    })) >= c.company.seats
  )
    fail("Komanda limiti dolub.", 409);
  const target = str(b.reassignId, 100);
  if (target) {
    if (target === m.id) fail("Başqa əməkdaş seçin.");
    await seat(db, target, c.company.id);
    await db.crmEntry.updateMany({
      where: { companyId: c.company.id, assigneeId: m.id, deletedAt: null },
      data: { assigneeId: target, version: { increment: 1 } },
    });
  }
  await db.crmSeat.update({
    where: { id: m.id },
    data: {
      role: b.role as (typeof roles)[number],
      team: str(b.team, 80) || null,
      active: b.active !== false,
      grants: b.grants ? grants(b.grants) : Prisma.DbNull,
    },
  });
  if (b.active === false)
    await db.crmInvitation.updateMany({
      where: {
        companyId: c.company.id,
        email: m.user.email?.toLowerCase() || "",
        acceptedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  await log(
    db,
    c.company.id,
    c.user,
    "MEMBER_CHANGED",
    {
      id: m.id,
      role: String(b.role),
      active: b.active !== false,
      reassignId: target,
    },
    undefined,
    Boolean(c.support),
  );
  return { ok: true };
}
export async function transfer(db: DB, c: Context, b: Record<string, unknown>) {
  write(c);
  if (c.support || c.member?.role !== "OWNER" || b.confirm !== c.company.name)
    fail("Sahibliyi şirkət adı ilə ayrıca təsdiqləyin.", 403);
  const target = await seat(db, required(b.id), c.company.id);
  if (target.id === c.member.id) fail("Başqa əməkdaş seçin.");
  await db.crmSeat.update({
    where: { id: c.member.id },
    data: { role: "ADMIN", grants: Prisma.DbNull },
  });
  await db.crmSeat.update({
    where: { id: target.id },
    data: { role: "OWNER", grants: Prisma.DbNull, welcomedAt: new Date() },
  });
  await log(db, c.company.id, c.user, "OWNERSHIP_TRANSFERRED", {
    from: c.member.id,
    to: target.id,
  });
  return { ok: true };
}
export async function meta(db: DB, c: Context) {
  const members = await db.crmSeat.findMany({
    where: { companyId: c.company.id, active: true },
    select: { id: true, team: true, user: { select: { email: true } } },
  });
  const scope = c.support
    ? "ALL"
    : grant(c.member!.role, "customers", "read", c.member!.grants);
  return {
    company: { ...c.company, state: c.state },
    member: c.member,
    permissions: Object.fromEntries(
      [
        "customers",
        "sales",
        "tasks",
        "calendar",
        "quotes",
        "payments",
        "messages",
        "reports",
        "team",
        "settings",
        "billing",
        "automation",
      ].map((m) => [
        m,
        Object.fromEntries(
          ["read", "create", "update", "delete", "export"].map((op) => [
            op,
            c.support
              ? op === "read" || op === "export" || c.support === "WRITE"
                ? "ALL"
                : "NONE"
              : grant(c.member!.role, m, op as "read", c.member!.grants),
          ]),
        ),
      ]),
    ),
    members: members.filter(
      (m) =>
        scope === "ALL" ||
        m.id === c.member?.id ||
        (scope === "TEAM" && c.member?.team && m.team === c.member.team),
    ),
    support: c.support,
    email: c.user.email,
    notifications: await db.crmEvent.findMany({
      where: { companyId: c.company.id, type: "NOTICE", userId: c.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    logo: await db.crmAttachment.findFirst({
      where: { companyId: c.company.id, entryId: null },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    }),
  };
}
