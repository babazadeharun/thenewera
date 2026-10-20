import { maintainSocial } from './social';
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { tx, lock, type Context, type DB, permit, write, log } from "./db";
import { state, required, fail } from "./policy";
import { syncMail, syncBooking, syncCalendarChanges } from "./sync";
import { mailError } from "./mail";
export async function workQueue(deadline = Date.now() + 25000) {
  let processed = 0;
  if (Date.now() > deadline) return { processed, pending: 0 };
  await maintainSocial(deadline);
  const stale = new Date(Date.now() - 10 * 60000);
  await prisma.crmJob.updateMany({
    where: { state: "RUNNING", claimedAt: { lt: stale } },
    data: {
      state: "UNCERTAIN",
      error: "İcra yarımçıq qalıb. Xarici nəticəni yoxlamadan təkrar etməyin.",
    },
  });
  const connections = await prisma.crmConnection.findMany({
    where: { active: true, company: { state: { in: ["TRIAL", "ACTIVE"] } } },
    orderBy: { updatedAt: "asc" },
    take: 10,
  });
  const bucket = Math.floor(Date.now() / 300000);
  for (const c of connections) {
    const key = "sync:" + c.id + ":" + bucket;
    await prisma.crmJob.upsert({
      where: { companyId_key: { companyId: c.companyId, key } },
      create: {
        companyId: c.companyId,
        key,
        kind: c.channel === "MAIL" ? "MAIL_SYNC" : "CALENDAR_PULL",
        data: { connectionId: c.id },
      },
      update: {},
    });
    await prisma.crmConnection.update({
      where: { id: c.id },
      data: { updatedAt: new Date() },
    });
  }
  const jobs = await prisma.crmJob.findMany({
    where: { state: "QUEUED", runAt: { lte: new Date() } },
    orderBy: { runAt: "asc" },
    take: 50,
  });
  for (const next of jobs) {
    if (Date.now() > deadline) break;
    const claimed = await tx(async (db) => {
      const company = await lock(db, next.companyId),
        fresh = await db.crmJob.findUnique({ where: { id: next.id } });
      if (!fresh || fresh.state !== "QUEUED") return null;
      if (!["TRIAL", "ACTIVE"].includes(state(company))) {
        await db.crmJob.update({
          where: { id: fresh.id },
          data: { state: "PAUSED", error: "Abunəlik aktiv deyil." },
        });
        return null;
      }
      const feature = fresh.kind === "MAIL_SYNC" ? "messages" : "calendar";
      if (!company.features.includes(feature)) {
        await db.crmJob.update({
          where: { id: fresh.id },
          data: { state: "PAUSED", error: "İmkan hazırkı plana daxil deyil." },
        });
        return null;
      }
      const result = await db.crmJob.updateMany({
        where: { id: fresh.id, state: "QUEUED" },
        data: {
          state: "RUNNING",
          attempts: { increment: 1 },
          claimedAt: new Date(),
        },
      });
      return result.count ? fresh : null;
    });
    if (!claimed) continue;
    try {
      const d = claimed.data as Record<string, unknown>;
      if (["MAIL_SYNC", "CALENDAR_PULL"].includes(claimed.kind)) {
        const current = await prisma.crmConnection.findFirst({
          where: {
            id: required(d.connectionId),
            companyId: claimed.companyId,
            active: true,
          },
        });
        if (
          !current ||
          !(await prisma.crmSeat.findFirst({
            where: {
              id: current.memberId,
              companyId: claimed.companyId,
              active: true,
            },
          }))
        )
          throw Error("CONNECTION_INACTIVE");
        if (claimed.kind === "MAIL_SYNC")
          await syncMail(current, Math.min(deadline, Date.now() + 10000));
        else
          await syncCalendarChanges(
            current,
            Math.min(deadline, Date.now() + 10000),
          );
      } else if (claimed.kind === "CALENDAR_PUSH") {
        const booking = await prisma.crmBooking.findFirst({
          where: { id: required(d.bookingId), companyId: claimed.companyId },
        });
        if (booking) await syncBooking(booking.id);
      } else if (
        claimed.kind === "BOOKING_MAIL" ||
        claimed.kind === "BOOKING_REMINDER"
      ) {
        const booking = await prisma.crmBooking.findFirst({
          where: {
            id: required(d.bookingId),
            companyId: claimed.companyId,
            status: "CONFIRMED",
          },
        });
        if (
          booking &&
          booking.startsAt.toISOString() === d.startsAt &&
          booking.startsAt > new Date()
        ) {
          await sendEmail({
            to: booking.email,
            subject:
              booking.title +
              (claimed.kind === "BOOKING_REMINDER"
                ? " — görüş xatırlatması"
                : " — rezervasiya təsdiqi"),
            text: `Görüşünüz: ${booking.title}\nVaxt: ${booking.startsAt.toLocaleString("az-AZ", { timeZone: booking.timezone })}\nSaat qurşağı: ${booking.timezone}\nVaxtı dəyişmək və ya ləğv etmək üçün New Era hesabınızdan rezervasiya səhifəsini açın.`,
          });
        }
      } else throw Error("JOB_KIND_UNKNOWN");
      await prisma.crmJob.update({
        where: { id: claimed.id },
        data: { state: "DONE", error: null },
      });
      processed++;
    } catch (error) {
      const message = ["MAIL_SYNC", "CALENDAR_PULL"].includes(claimed.kind)
        ? "Provayder sinxronizasiyası tamamlanmadı. Bağlantını və icazələri yoxlayın."
        : mailError(error).message;
      await prisma.crmJob.update({
        where: { id: claimed.id },
        data: {
          state: ["MAIL_SYNC", "CALENDAR_PULL"].includes(claimed.kind)
            ? "ERROR"
            : "UNCERTAIN",
          error: message,
        },
      });
      await prisma.crmEvent.create({
        data: {
          companyId: claimed.companyId,
          type: "PROVIDER",
          actorType: "SYSTEM",
          data: { channel: claimed.kind, state: "ERROR", message },
        },
      });
    }
  }
  return {
    processed,
    pending: await prisma.crmJob.count({ where: { state: "QUEUED" } }),
  };
}
export async function queueStatus(
  db: DB,
  c: Context,
  b?: Record<string, unknown>,
) {
  permit(c, "settings", b ? "update" : "read");
  if (!b)
    return db.crmJob.findMany({
      where: { companyId: c.company.id },
      select: {
        id: true,
        kind: true,
        state: true,
        error: true,
        runAt: true,
        attempts: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  write(c);
  if (b.confirm !== true)
    fail("Provayderdə nəticəni yoxladığınızı ayrıca təsdiqləyin.");
  const job =
    (await db.crmJob.findFirst({
      where: {
        id: required(b.id),
        companyId: c.company.id,
        state: { in: ["ERROR", "UNCERTAIN", "PAUSED"] },
      },
    })) || fail("İcra tapılmadı.", 404);
  await db.crmJob.update({
    where: { id: job.id },
    data: { state: "QUEUED", runAt: new Date(), error: null },
  });
  await log(
    db,
    c.company.id,
    c.user,
    "JOB_MANUALLY_RETRIED",
    { jobId: job.id },
    undefined,
    Boolean(c.support),
  );
  return { ok: true };
}
