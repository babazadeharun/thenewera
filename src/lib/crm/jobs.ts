import { unanswered } from "./lead-flow";
import { workQueue } from "./queue";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { tx, lock, notice, type Context } from "./db";
import { state } from "./policy";
import { automate } from "./records";
export async function jobs() {
  const budget = Date.now() + 35000;
  let checked = 0;
  const companies = await prisma.crmCompany.findMany({
    orderBy: { lastJobAt: { sort: "asc", nulls: "first" } },
    take: 25,
    select: { id: true },
  });
  let reminders = 0;
  for (const co of companies) {
    if (Date.now() > budget) break;
    checked++;
    await tx(async (db) => {
      const w = await lock(db, co.id),
        s = state(w);
      await db.crmCompany.update({
        where: { id: w.id },
        data: {
          lastJobAt: new Date(),
          ...(s === "EXPIRED" ? { state: "EXPIRED" } : {}),
        },
      });
      if (s === "SUSPENDED") return [];
      const owners = await db.crmSeat.findMany({
        where: { companyId: w.id, role: "OWNER", active: true },
        include: { user: { select: { email: true, verifiedAt: true } } },
      });
      const days = Math.ceil((w.trialEnd.getTime() - Date.now()) / 86400000);
      if (w.state === "TRIAL" && [7, 3, 1].includes(days))
        for (const owner of owners) {
          const key = `trial:${w.trialEnd.toISOString()}:${days}:${owner.userId}`;
          await notice(
            db,
            w.id,
            owner.userId,
            key + ":notice",
            `Pulsuz istifadənin bitməsinə ${days} gün qalıb.`,
          );
          if (
            !owner.user.email ||
            !owner.user.verifiedAt ||
            (await db.crmEvent.findUnique({
              where: { companyId_key: { companyId: w.id, key } },
            }))
          )
            continue;
          await db.crmEvent.create({
            data: {
              companyId: w.id,
              type: "REMINDER",
              key,
              userId: owner.userId,
              data: {
                status: "QUEUED",
                to: owner.user.email,
                name: w.name,
                days,
                end: w.trialEnd.toISOString(),
              },
            },
          });
        }
      if (["TRIAL", "ACTIVE"].includes(s) && owners[0]) {
        const owner = owners[0],
          c: Context = {
            company: w,
            member: owner,
            user: {
              id: owner.userId,
              email: owner.user.email,
              verifiedAt: owner.user.verifiedAt,
              role: "CLIENT",
            },
            support: null,
            state: s,
          };
        await unanswered(db, w);
        const items = await db.crmEntry.findMany({
          where: {
            companyId: w.id,
            kind: { in: ["tasks", "calendar"] },
            status: { in: ["OPEN", "IN_PROGRESS"] },
            deletedAt: null,
            ...(w.jobCursor ? { id: { gt: w.jobCursor } } : {}),
          },
          orderBy: { id: "asc" },
          take: 100,
        });
        await db.crmCompany.update({
          where: { id: w.id },
          data: {
            jobCursor: items.length === 100 ? items[items.length - 1].id : null,
          },
        });
        for (const item of items) {
          if (item.dueAt && item.dueAt < new Date())
            await automate(db, c, item, "OVERDUE");
          const at = (item.data as Record<string, unknown>).reminderAt;
          if (at && new Date(String(at)) <= new Date() && item.assigneeId) {
            const target = await db.crmSeat.findFirst({
              where: { id: item.assigneeId, companyId: w.id, active: true },
            });
            if (target)
              await notice(
                db,
                w.id,
                target.userId,
                `task:${item.id}:${at}`,
                "Planlaşdırılmış iş xatırlatmanız var.",
              );
          }
        }
      }
      return;
    });
  }
  // Persistent outbox: unattempted reminders survive a timed-out scheduler invocation.
  const queued = await prisma.crmEvent.findMany({
    where: { type: "REMINDER", data: { path: ["status"], equals: "QUEUED" } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  const deadline = budget;
  for (const queuedEvent of queued) {
    if (Date.now() > deadline) break;
    const delivery = await tx(async (db) => {
      const w = await lock(db, queuedEvent.companyId),
        e = await db.crmEvent.findUnique({ where: { id: queuedEvent.id } });
      if (!e || (e.data as Record<string, unknown>).status !== "QUEUED")
        return null;
      const d = e.data as Record<string, unknown>;
      const owner = await db.crmSeat.findFirst({
        where: {
          companyId: w.id,
          userId: e.userId || "",
          role: "OWNER",
          active: true,
        },
        include: { user: { select: { email: true, verifiedAt: true } } },
      });
      if (
        !owner?.user.verifiedAt ||
        !owner.user.email ||
        state(w) !== "TRIAL" ||
        w.trialEnd.toISOString() !== d.end
      ) {
        await db.crmEvent.update({
          where: { id: e.id },
          data: { data: { status: "SKIPPED" } },
        });
        return null;
      }
      await db.crmEvent.update({
        where: { id: e.id },
        data: { data: { ...d, status: "CLAIMED" } as never },
      });
      return {
        id: e.id,
        to: owner.user.email,
        name: w.name,
        days: Math.ceil((w.trialEnd.getTime() - Date.now()) / 86400000),
        end: w.trialEnd.toISOString(),
      };
    });
    if (!delivery) continue;
    try {
      await sendEmail({
        to: delivery.to,
        subject: `${delivery.name} — pulsuz istifadə bitir`,
        text: `Pulsuz istifadənin bitməsinə ${delivery.days} gün qalıb. Bitmə tarixi ${delivery.end}. Avtomatik ödəniş tutulmayacaq. Workspace-in abunəlik bölməsinə daxil olun.`,
      });
      await prisma.crmEvent.update({
        where: { id: delivery.id },
        data: { data: { status: "SENT" } },
      });
      reminders++;
    } catch {
      await prisma.crmEvent.update({
        where: { id: delivery.id },
        data: {
          data: {
            status: "ERROR",
            message:
              "E-poçt təsdiqlənmədi. Provayderi yoxlayın; avtomatik təkrar yoxdur.",
          },
        },
      });
    }
  }
  const queue = await workQueue(budget);
  return {
    queue,
    checked,
    reminders,
    pending: await prisma.crmEvent.count({
      where: { type: "REMINDER", data: { path: ["status"], equals: "QUEUED" } },
    }),
  };
}
