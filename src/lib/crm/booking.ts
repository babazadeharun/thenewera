import { calendarBusy } from "./sync";
import { prisma } from "@/lib/prisma";
import {
  tx,
  lock,
  seat,
  permit,
  write,
  log,
  notice,
  token,
  type DB,
  type Context,
  type Actor,
} from "./db";
import { fail, required, str, state, integer } from "./policy";
export function zonedParts(at: Date, zone: string) {
  try {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    }).formatToParts(at);
    return Object.fromEntries(p.map((x) => [x.type, x.value]));
  } catch {
    fail("Saat qurşağı düzgün deyil.");
  }
}
const localDay = (p: ReturnType<typeof zonedParts>) =>
  `${p.year}-${p.month}-${p.day}`;
export async function schedules(
  db: DB,
  c: Context,
  b?: Record<string, unknown>,
) {
  permit(c, "calendar", b ? "create" : "read");
  if (!b)
    return db.crmSchedule.findMany({ where: { companyId: c.company.id } });
  write(c, "calendar");
  permit(c, "settings", "update");
  const assignee = await seat(db, required(b.assigneeId), c.company.id),
    timezone = required(b.timezone, 80);
  zonedParts(new Date(), timezone);
  const availability = (
    Array.isArray(b.availability) ? b.availability : []
  ) as { day: string; start: string; end: string }[];
  if (!availability.length || availability.length > 21)
    fail("İş saatlarını seçin.");
  for (const v of availability)
    if (
      !["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].includes(v.day) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.end) ||
      v.start >= v.end
    )
      fail("İş saatları düzgün deyil.");
  const data = {
    title: required(b.title),
    assigneeId: assignee.id,
    timezone,
    duration: integer(b.duration, 240),
    buffer: Math.min(120, Math.floor(Number(b.buffer) || 0)),
    leadHours: Math.min(168, Math.max(0, Math.floor(Number(b.leadHours) || 2))),
    horizonDays: integer(b.horizonDays || 30, 120),
    availability,
    active: b.active !== false,
  };
  if (data.buffer < 0) fail("Fasilə düzgün deyil.");
  const r = b.id
    ? await db.crmSchedule.updateMany({
        where: { id: required(b.id), companyId: c.company.id },
        data,
      })
    : await db.crmSchedule.create({
        data: { ...data, companyId: c.company.id, slug: token().slice(0, 24) },
      });
  await log(
    db,
    c.company.id,
    c.user,
    "SCHEDULE_CHANGED",
    {},
    undefined,
    Boolean(c.support),
  );
  return r;
}
async function schedule(db: DB, slug: string) {
  const s =
    (await db.crmSchedule.findUnique({
      where: { slug },
      include: { company: true },
    })) || fail("Rezervasiya səhifəsi tapılmadı.", 404);
  if (
    !s.active ||
    !["TRIAL", "ACTIVE"].includes(state(s.company)) ||
    !s.company.features.includes("calendar")
  )
    fail("Rezervasiya hazırda bağlıdır.", 403);
  await seat(db, s.assigneeId, s.companyId);
  return s;
}
export async function slots(
  db: DB,
  slug: string,
  day: string,
  ignoreBooking?: string,
) {
  const s = await schedule(db, slug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) fail("Tarix düzgün deyil.");
  const dayAt = new Date(day + "T00:00:00Z");
  if (
    !Number.isFinite(dayAt.getTime()) ||
    dayAt < new Date(Date.now() - 86400000) ||
    dayAt > new Date(Date.now() + s.horizonDays * 86400000)
  )
    fail("Rezervasiya tarix aralığında deyil.");
  const low = new Date(dayAt.getTime() - 14 * 3600000),
    high = new Date(dayAt.getTime() + 38 * 3600000);
  const busy = await db.crmBooking.findMany({
    where: {
      companyId: s.companyId,
      assigneeId: s.assigneeId,
      status: "CONFIRMED",
      startsAt: { lt: high },
      endsAt: { gt: low },
      ...(ignoreBooking ? { id: { not: ignoreBooking } } : {}),
    },
  });
  const ignore = ignoreBooking
    ? await db.crmBooking.findUnique({ where: { id: ignoreBooking } })
    : null;
  const events = await db.crmEntry.findMany({
    where: {
      companyId: s.companyId,
      kind: "calendar",
      assigneeId: s.assigneeId,
      status: { not: "CANCELLED" },
      deletedAt: null,
      dueAt: { gte: low, lte: high },
      ...(ignore?.calendarEntryId
        ? { id: { not: ignore.calendarEntryId } }
        : {}),
    },
  });
  const remote = await calendarBusy(db, s.companyId, s.assigneeId, low, high);
  const remoteIgnore = ignore?.external as Record<string, unknown> | undefined;
  const result = [];
  for (let ms = low.getTime(); ms < high.getTime(); ms += 15 * 60000) {
    const start = new Date(ms),
      end = new Date(ms + s.duration * 60000),
      a = zonedParts(start, s.timezone),
      b = zonedParts(end, s.timezone),
      time = a.hour + ":" + a.minute,
      endTime = b.hour + ":" + b.minute;
    if (
      localDay(a) !== day ||
      localDay(b) !== day ||
      ms < Date.now() + s.leadHours * 3600000
    )
      continue;
    const range = (
      s.availability as { day: string; start: string; end: string }[]
    ).find((v) => v.day === a.weekday && time >= v.start && endTime <= v.end);
    if (!range) continue;
    const pad = s.buffer * 60000;
    if (
      remote.some(
        (v: { id: string; start: Date; end: Date }) =>
          v.id !== remoteIgnore?.id &&
          v.start.getTime() < end.getTime() + pad &&
          v.end.getTime() > ms - pad,
      ) ||
      busy.some(
        (v) =>
          v.startsAt.getTime() < end.getTime() + pad &&
          v.endsAt.getTime() > ms - pad,
      ) ||
      events.some(
        (e) =>
          e.dueAt!.getTime() < end.getTime() + pad &&
          e.dueAt!.getTime() +
            Math.max(
              15,
              Number((e.data as Record<string, unknown>).durationMinutes) || 30,
            ) *
              60000 >
            ms - pad,
      )
    )
      continue;
    result.push(start.toISOString());
  }
  return {
    schedule: {
      title: s.title,
      timezone: s.timezone,
      duration: s.duration,
      company: s.company.name,
      companyId: s.companyId,
      id: s.id,
    },
    slots: result,
  };
}
export async function book(u: Actor, slug: string, b: Record<string, unknown>) {
  if (!u.email || !u.verifiedAt)
    fail("Mövcud hesabla daxil olub e-poçtunuzu təsdiqləyin.", 401);
  return tx(async (db) => {
    const before = await schedule(db, slug),
      company = await lock(db, before.companyId);
    const requestKey = required(b.requestKey, 100);
    if (!/^[a-zA-Z0-9_-]{12,100}$/.test(requestKey))
      fail("Sorğu açarı düzgün deyil.");
    const prior = await db.crmBooking.findUnique({
      where: { companyId_requestKey: { companyId: company.id, requestKey } },
    });
    if (prior) {
      if (prior.userId !== u.id) fail("Sorğu uyğun deyil.", 409);
      return prior;
    }
    const booking = b.bookingId
      ? (await db.crmBooking.findFirst({
          where: {
            id: required(b.bookingId),
            companyId: company.id,
            userId: u.id,
            scheduleId: before.id,
            status: "CONFIRMED",
          },
        })) || fail("Rezervasiya tapılmadı.", 404)
      : null;
    if (b.action === "cancel") {
      if (!booking) fail("Rezervasiya seçin.");
      await db.crmBooking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED" },
      });
      if (booking.calendarEntryId)
        await db.crmEntry.update({
          where: { id: booking.calendarEntryId },
          data: { status: "CANCELLED", version: { increment: 1 } },
        });
      await db.crmEvent.create({
        data: {
          companyId: company.id,
          type: "AUDIT",
          actorId: u.id,
          actorType: "CUSTOMER",
          data: { action: "BOOKING_CANCELLED", id: booking.id },
        },
      });
      await db.crmJob.upsert({
        where: {
          companyId_key: { companyId: company.id, key: "cancel:" + booking.id },
        },
        create: {
          companyId: company.id,
          key: "cancel:" + booking.id,
          kind: "CALENDAR_PUSH",
          data: { bookingId: booking.id },
        },
        update: {},
      });
      return { ok: true };
    }
    const startsAt = new Date(required(b.startsAt));
    if (!Number.isFinite(startsAt.getTime())) fail("Vaxt düzgün deyil.");
    const day = localDay(zonedParts(startsAt, before.timezone)),
      available = await slots(db, slug, day, booking?.id);
    if (!available.slots.includes(startsAt.toISOString()))
      fail("Bu vaxt artıq mövcud deyil. Başqa vaxt seçin.", 409);
    const endsAt = new Date(startsAt.getTime() + before.duration * 60000);
    let customer = await db.crmEntry.findFirst({
      where: {
        companyId: company.id,
        kind: "customers",
        deletedAt: null,
        email: u.email!.toLowerCase(),
      },
    });
    const count = await db.crmEntry.count({
      where: { companyId: company.id, deletedAt: null },
    });
    if (count + (customer ? 0 : 1) + (booking ? 0 : 1) > company.records)
      fail("Şirkətin qeyd limiti dolub.", 409);
    if (!customer)
      customer = await db.crmEntry.create({
        data: {
          companyId: company.id,
          kind: "customers",
          title: required(b.name || u.email),
          email: u.email!.toLowerCase(),
          status: "OPEN",
          authorId: "BOOKING",
          assigneeId: before.assigneeId,
          data: { source: "Rezervasiya" },
        },
      });
    let item = booking?.calendarEntryId
      ? await db.crmEntry.findUnique({ where: { id: booking.calendarEntryId } })
      : null;
    const values = {
      title: before.title + " — " + customer.title,
      customerId: customer.id,
      dueAt: startsAt,
      assigneeId: before.assigneeId,
      status: "OPEN",
      data: {
        durationMinutes: before.duration,
        priority: "NORMAL",
        notes: "Müştəri rezervasiyası",
        reminderAt: new Date(startsAt.getTime() - 3600000).toISOString(),
      },
    };
    item = item
      ? await db.crmEntry.update({
          where: { id: item.id },
          data: { ...values, version: { increment: 1 } },
        })
      : await db.crmEntry.create({
          data: {
            ...values,
            companyId: company.id,
            kind: "calendar",
            authorId: "BOOKING",
          },
        });
    const value = {
      assigneeId: before.assigneeId,
      userId: u.id,
      customerId: customer.id,
      calendarEntryId: item.id,
      email: u.email!.toLowerCase(),
      title: before.title,
      startsAt,
      endsAt,
      timezone: before.timezone,
    };
    const result = booking
      ? await db.crmBooking.update({ where: { id: booking.id }, data: value })
      : await db.crmBooking.create({
          data: {
            ...value,
            companyId: company.id,
            scheduleId: before.id,
            requestKey,
          },
        });
    await db.crmEvent.create({
      data: {
        companyId: company.id,
        type: "AUDIT",
        actorId: u.id,
        actorType: "CUSTOMER",
        entryId: item.id,
        data: {
          action: booking ? "BOOKING_MOVED" : "BOOKING_CREATED",
          bookingId: result.id,
        },
      },
    });
    const target = await seat(db, before.assigneeId, company.id);
    await notice(
      db,
      company.id,
      target.userId,
      "booking:" + result.id + ":" + startsAt.toISOString(),
      "Yeni və ya dəyişdirilmiş rezervasiya var.",
    );
    await db.crmJob.upsert({
      where: {
        companyId_key: {
          companyId: company.id,
          key: "booking:" + result.id + ":" + startsAt.toISOString(),
        },
      },
      create: {
        companyId: company.id,
        key: "booking:" + result.id + ":" + startsAt.toISOString(),
        kind: "BOOKING_MAIL",
        data: { bookingId: result.id, startsAt: startsAt.toISOString() },
      },
      update: {},
    });
    for (const [kind, runAt] of [
      ["CALENDAR_PUSH", new Date()],
      ["BOOKING_REMINDER", new Date(startsAt.getTime() - 3600000)],
    ] as const) {
      await db.crmJob.upsert({
        where: {
          companyId_key: {
            companyId: company.id,
            key: kind + ":" + result.id + ":" + startsAt.toISOString(),
          },
        },
        create: {
          companyId: company.id,
          key: kind + ":" + result.id + ":" + startsAt.toISOString(),
          kind,
          runAt,
          data: { bookingId: result.id, startsAt: startsAt.toISOString() },
        },
        update: {},
      });
    }
    return result;
  });
}

// Keep staff calendar edits and public bookings in the same company transaction.
export async function syncCalendarEdit(
  db: DB,
  c: Context,
  old: { id: string; version: number },
  value: {
    title: string;
    status: string;
    dueAt: Date | null;
    assigneeId: string | null;
    customerId: string | null;
    data: Record<string, unknown>;
  },
) {
  const booking = await db.crmBooking.findFirst({
    where: { companyId: c.company.id, calendarEntryId: old.id },
  });
  if (!booking) return;
  if (
    value.assigneeId !== booking.assigneeId ||
    value.customerId !== booking.customerId
  )
    fail(
      "Rezervasiyanın müştərisini və məsul əməkdaşını adi təqvim formasından dəyişmək olmaz.",
    );
  const schedule = await db.crmSchedule.findUniqueOrThrow({
    where: { id: booking.scheduleId },
  });
  const bookingDuration = Math.round(
    (booking.endsAt.getTime() - booking.startsAt.getTime()) / 60000,
  );
  if (Number(value.data.durationMinutes) !== bookingDuration)
    fail(
      "Bağlı rezervasiyanın müddəti rezervasiya səhifəsinə uyğun olmalıdır.",
    );
  const nextStatus =
    value.status === "CANCELLED"
      ? "CANCELLED"
      : value.status === "DONE"
        ? "COMPLETED"
        : "CONFIRMED";
  const startsAt = value.dueAt || booking.startsAt;
  if (
    nextStatus === "CONFIRMED" &&
    (!value.dueAt ||
      startsAt.getTime() !== booking.startsAt.getTime() ||
      booking.status !== "CONFIRMED")
  ) {
    if (!value.dueAt) fail("Rezervasiya vaxtını daxil edin.");
    const day = localDay(zonedParts(startsAt, booking.timezone));
    const available = await slots(db, schedule.slug, day, booking.id);
    if (!available.slots.includes(startsAt.toISOString()))
      fail("Seçilmiş rezervasiya vaxtı artıq mövcud deyil.", 409);
  }
  await db.crmBooking.update({
    where: { id: booking.id },
    data: {
      title: value.title,
      status: nextStatus,
      startsAt,
      endsAt: new Date(startsAt.getTime() + bookingDuration * 60000),
    },
  });
  if (nextStatus !== "COMPLETED")
    await db.crmJob.upsert({
      where: {
        companyId_key: {
          companyId: c.company.id,
          key: "booking-edit:" + booking.id + ":" + (old.version + 1),
        },
      },
      create: {
        companyId: c.company.id,
        key: "booking-edit:" + booking.id + ":" + (old.version + 1),
        kind: "CALENDAR_PUSH",
        data: { bookingId: booking.id },
      },
      update: {},
    });
}
