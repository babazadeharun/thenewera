import { Prisma } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fail, grant, state, type Op, type Role } from "./policy";
export type DB = Prisma.TransactionClient;
export type Actor = {
  id: string;
  email: string | null;
  role: string;
  verifiedAt: Date | null;
};
export const hash = (v: string) => createHash("sha256").update(v).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export async function actor(): Promise<Actor> {
  const u = await getCurrentUser();
  if (!u) fail("Daxil olun.", 401);
  await (await import("./security")).ensureSecondFactor(u.id);
  return { id: u.id, email: u.email, role: u.role, verifiedAt: u.verifiedAt };
}
export function verified(u: Actor) {
  if (!u.email || !u.verifiedAt)
    fail("E-poçtunuzu mövcud təsdiq axını ilə təsdiqləyin.", 403);
}
export const tx = <T>(fn: (db: DB) => Promise<T>) =>
  prisma.$transaction(fn, { isolationLevel: "Serializable", timeout: 20000 });
export async function lock(db: DB, id: string) {
  await db.$queryRaw`SELECT "id" FROM "CrmCompany" WHERE "id"=${id} FOR UPDATE`;
  return (
    (await db.crmCompany.findUnique({ where: { id } })) ||
    fail("Şirkət tapılmadı.", 404)
  );
}
export async function log(
  db: DB,
  id: string,
  u: Actor,
  action: string,
  data: Prisma.InputJsonValue = {},
  entryId?: string,
  support = false,
) {
  await db.crmEvent.create({
    data: {
      companyId: id,
      type: "AUDIT",
      actorId: u.id,
      actorType: support ? "PLATFORM" : "MEMBER",
      entryId,
      data: { action, detail: data },
    },
  });
}
export async function context(
  db: DB,
  u: Actor,
  id: string,
  support?: string | null,
) {
  const company = await lock(db, id);
  const member = await db.crmSeat.findUnique({
    where: { companyId_userId: { companyId: id, userId: u.id } },
  });
  let mode: string | null = null;
  if (support && u.role === "SUPER_ADMIN") {
    const session =
      (await db.crmSupportSession.findFirst({
        where: {
          id: support,
          companyId: id,
          actorId: u.id,
          expiresAt: { gt: new Date() },
        },
      })) || fail("Dəstək baxışı bitib.", 403);
    mode = session.mode;
    await log(
      db,
      id,
      u,
      "SUPPORT_ACCESS",
      { mode, reason: session.reason },
      undefined,
      true,
    );
  }
  if (!mode) {
    verified(u);
    if (!member?.active) fail("Bu Workspace-ə aktiv girişiniz yoxdur.", 403);
  }
  return {
    company,
    member: member?.active ? member : null,
    user: u,
    support: mode,
    state: state(company),
  };
}
export type Context = Awaited<ReturnType<typeof context>>;
export function permit(c: Context, module: string, op: Op) {
  if (c.state === "SUSPENDED" && !c.support)
    fail("Workspace dayandırılıb.", 403);
  if (c.support) {
    if (!["read", "export"].includes(op) && c.support !== "WRITE")
      fail("Super Admin baxışı yalnız oxuma üçündür.", 403);
    return "ALL" as const;
  }
  const scope = grant(c.member!.role, module, op, c.member!.grants);
  if (scope === "NONE") fail("Bu əməliyyata icazəniz yoxdur.", 403);
  return scope;
}
export function write(c: Context, module?: string) {
  if (c.support === "READ") fail("Yalnız baxış rejimi.", 403);
  if (!["TRIAL", "ACTIVE"].includes(c.state))
    fail("Davam etmək üçün şirkət rəhbəri abunəliyi aktivləşdirməlidir.", 402);
  if (module && !c.company.features.includes(module))
    fail("Bu imkan plana daxil deyil.", 403);
}
export async function where(
  db: DB,
  c: Context,
  kind: string,
  op: Op = "read",
): Promise<Prisma.CrmEntryWhereInput> {
  const scope = permit(c, kind, op),
    base = { companyId: c.company.id, kind, deletedAt: null };
  if (scope === "ALL") return base;
  const seats =
    scope === "TEAM" && c.member?.team
      ? await db.crmSeat.findMany({
          where: { companyId: c.company.id, team: c.member.team, active: true },
          select: { id: true, userId: true },
        })
      : [{ id: c.member!.id, userId: c.user.id }];
  return {
    ...base,
    OR: [
      { assigneeId: { in: seats.map((x) => x.id) } },
      { participants: { hasSome: seats.map((x) => x.id) } },
      { authorId: { in: seats.map((x) => x.userId) } },
    ],
  };
}
export async function entry(db: DB, c: Context, id: string, op: Op = "read") {
  const meta =
    (await db.crmEntry.findFirst({
      where: { id, companyId: c.company.id, deletedAt: null },
      select: { kind: true },
    })) || fail("Qeyd tapılmadı.", 404);
  return (
    (await db.crmEntry.findFirst({
      where: { AND: [{ id }, await where(db, c, meta.kind, op)] },
    })) || fail("Qeyd tapılmadı.", 404)
  );
}
export async function seat(db: DB, id: string, companyId: string) {
  return (
    (await db.crmSeat.findFirst({ where: { id, companyId, active: true } })) ||
    fail("Əməkdaş bu şirkətə aid deyil.")
  );
}
export async function initialPlan(db: DB) {
  await db.$queryRaw`SELECT pg_advisory_xact_lock(78261016)::text`;
  return (
    (await db.crmPlan.findFirst({
      where: { trialDefault: true, archived: false },
    })) ||
    (await db.crmPlan.create({
      data: { name: "1 aylıq pulsuz sınaq", trialDefault: true },
    }))
  );
}
export async function notice(
  db: DB,
  companyId: string,
  userId: string,
  key: string,
  title: string,
) {
  return db.crmEvent.upsert({
    where: { companyId_key: { companyId, key } },
    create: {
      companyId,
      key,
      userId,
      type: "NOTICE",
      data: { title, read: false },
    },
    update: {},
  });
}
export const publicSeat = {
  id: true,
  userId: true,
  role: true,
  team: true,
  active: true,
  grants: true,
  welcomedAt: true,
  dismissedAt: true,
  user: { select: { email: true } },
} as const;
export const publicInvite = {
  id: true,
  email: true,
  role: true,
  team: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  createdAt: true,
  sentAt: true,
  error: true,
} as const;
