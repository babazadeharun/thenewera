import { inboundLead } from "./lead-flow";
import { prisma } from "@/lib/prisma";
import { tx, lock, hash } from "./db";
import { requestJSON, credential } from "./connections";
import { state, fail } from "./policy";
import type { CrmConnection, Prisma } from "@prisma/client";
const emailOf = (s: string) => {
  const m = s.match(/<([^<>\s]+@[^<>\s]+)>/) || s.match(/([^<>\s]+@[^<>\s]+)/);
  return (m?.[1] || "").toLowerCase();
};
function plainPart(p: any): string {
  if (p.mimeType === "text/plain" && p.body?.data)
    return Buffer.from(p.body.data, "base64url").toString("utf8");
  return (p.parts || []).map(plainPart).filter(Boolean).join("\n");
}
export async function syncMail(
  conn: CrmConnection,
  deadline = Date.now() + 10000,
) {
  const access = await credential(conn),
    cursor = conn.cursor as Record<string, unknown>;
  const after =
      Number(cursor.after) || Math.floor(Date.now() / 1000) - 7 * 86400,
    until = Number(cursor.until) || Math.floor(Date.now() / 1000);
  let items: {
      id: string;
      from: string;
      subject: string;
      text: string;
      date: string;
    }[] = [],
    next = "",
    remaining: string[] = [];
  if (conn.provider === "google") {
    const q = new URLSearchParams({
        maxResults: "20",
        q: `in:inbox after:${after} before:${until + 1}`,
        ...(cursor.page ? { pageToken: String(cursor.page) } : {}),
      }),
      page =
        Array.isArray(cursor.pendingIds) && cursor.pendingIds.length
          ? {
              messages: cursor.pendingIds.map((id) => ({ id })),
              nextPageToken: cursor.page || "",
            }
          : await requestJSON(
              "https://gmail.googleapis.com/gmail/v1/users/me/messages?" + q,
              access,
            );
    const messages = page.messages || [];
    for (let index = 0; index < messages.length; index++) {
      const m = messages[index];
      if (Date.now() > deadline) {
        remaining = messages.slice(index).map((m: any) => String(m.id));
        break;
      }
      const body = await requestJSON(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages/" +
            encodeURIComponent(m.id) +
            "?format=full",
          access,
        ),
        headers = body.payload?.headers || [],
        get = (name: string) =>
          String(
            headers.find((h: any) => String(h.name).toLowerCase() === name)
              ?.value || "",
          );
      items.push({
        id: String(body.id),
        from: emailOf(get("from")),
        subject: get("subject"),
        text: plainPart(body.payload) || String(body.snippet || ""),
        date: new Date(Number(body.internalDate) || Date.now()).toISOString(),
      });
    }
    next = String(page.nextPageToken || "");
  } else {
    let url = cursor.page
      ? String(cursor.page)
      : "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?" +
        new URLSearchParams({
          $top: "20",
          $select: "id,from,subject,bodyPreview,receivedDateTime",
          $filter: `receivedDateTime ge ${new Date(after * 1000).toISOString()} and receivedDateTime le ${new Date(until * 1000).toISOString()}`,
          $orderby: "receivedDateTime asc",
        });
    if (!url.startsWith("https://graph.microsoft.com/v1.0/me/"))
      fail("Provayder səhifəsi düzgün deyil.", 502);
    const page = await requestJSON(url, access);
    items = (page.value || []).map((m: any) => ({
      id: String(m.id),
      from: String(m.from?.emailAddress?.address || "").toLowerCase(),
      subject: String(m.subject || "E-poçt"),
      text: String(m.bodyPreview || ""),
      date: String(m.receivedDateTime),
    }));
    next = String(page["@odata.nextLink"] || "");
  }
  await tx(async (db) => {
    const company = await lock(db, conn.companyId),
      fresh = await db.crmConnection.findFirst({
        where: { id: conn.id, companyId: company.id, active: true },
      }),
      member = await db.crmSeat.findFirst({
        where: { id: conn.memberId, companyId: company.id, active: true },
      });
    if (
      !fresh ||
      !member ||
      !["TRIAL", "ACTIVE"].includes(state(company)) ||
      !company.features.includes("messages")
    )
      return;
    for (const m of items) {
      if (!m.from) continue;
      const key = "mail:" + conn.id + ":" + hash(m.id);
      if (
        await db.crmEvent.findUnique({
          where: { companyId_key: { companyId: company.id, key } },
        })
      )
        continue;
      if (
        (await db.crmEntry.count({
          where: { companyId: company.id, deletedAt: null },
        })) >= company.records
      )
        fail("Qeyd limiti dolub.", 409);
      const lead = await inboundLead(db, company, { channel: "EMAIL", contact: m.from, fallbackId: member.id });
      const customer = lead.customer;
      const createdAt = new Date(m.date),
        at = Number.isFinite(createdAt.getTime()) ? createdAt : new Date();
      const item = await db.crmEntry.create({
        data: {
          companyId: company.id,
          kind: "messages",
          title: m.subject.slice(0, 200) || "E-poçt",
          customerId: customer?.id || null,
          saleId: lead.sale?.id || null,
          assigneeId: lead.assigneeId,
          participants: customer?.participants || [],
          authorId: "SYSTEM",
          status: "RECEIVED",
          createdAt: at,
          data: {
            channel: "EMAIL",
            delivery: "RECEIVED",
            to: m.from,
            body: m.text.slice(0, 20000),
            providerId: m.id,
          },
        },
      });
      await db.crmEvent.create({
        data: {
          companyId: company.id,
          type: "AUDIT",
          key,
          entryId: item.id,
          actorType: "SYSTEM",
          data: { action: "MAIL_RECEIVED" },
        },
      });
      const previousThread = await db.crmThread.findUnique({ where: { companyId_channel_contact: { companyId: company.id, channel: "EMAIL", contact: m.from } } });
      const pendingDue = previousThread?.responseDueAt && (!previousThread.lastOutboundAt || !previousThread.lastInboundAt || previousThread.lastOutboundAt < previousThread.lastInboundAt) ? previousThread.responseDueAt : null;
      await db.crmThread.upsert({
        where: {
          companyId_channel_contact: {
            companyId: company.id,
            channel: "EMAIL",
            contact: m.from,
          },
        },
        create: {
          companyId: company.id,
          channel: "EMAIL",
          contact: m.from,
          title: m.subject.slice(0, 200),
          customerId: customer?.id || null,
          assigneeId: lead.assigneeId,
          lastInboundAt: at,
          responseDueAt: new Date(
            at.getTime() +
              (Number((company.preferences as any).slaMinutes) || 30) * 60000,
          ),
        },
        update: !previousThread?.lastInboundAt || previousThread.lastInboundAt < at ? {
          lastInboundAt: at,
          responseDueAt: pendingDue || new Date(at.getTime() + (Number((company.preferences as any).slaMinutes) || 30) * 60000),
          customerId: customer?.id || null,
          assigneeId: lead.assigneeId,
          status: "OPEN",
        } : {},
      });
    }
    await db.crmConnection.update({
      where: { id: conn.id },
      data: {
        cursor: remaining.length
          ? { pendingIds: remaining, page: next, after, until }
          : next
            ? { page: next, after, until }
            : { after: until - 60 },
      },
    });
    await db.crmEvent.create({
      data: {
        companyId: company.id,
        type: "PROVIDER",
        actorType: "SYSTEM",
        data: {
          channel: "EMAIL_INBOX",
          state: "CONNECTED",
          count: items.length,
        },
      },
    });
  });
  return { count: items.length };
}
export async function calendarBusy(
  db: any,
  companyId: string,
  memberId: string,
  from: Date,
  to: Date,
) {
  const conn = await db.crmConnection.findFirst({
    where: { companyId, memberId, channel: "CALENDAR", active: true },
  });
  if (!conn) return [];
  const access = await credential(conn, db);
  if (conn.provider === "google") {
    const result = await requestJSON(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
        new URLSearchParams({
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          singleEvents: "true",
          maxResults: "250",
        }),
      access,
    );
    if (result.nextPageToken)
      fail("Təqvimdə çox görüş var; intervalı daraldın.", 503);
    return (result.items || [])
      .filter(
        (e: any) =>
          e.status !== "cancelled" && e.transparency !== "transparent",
      )
      .map((e: any) => ({
        id: String(e.id),
        start: new Date(e.start.dateTime || e.start.date + "T00:00:00Z"),
        end: new Date(e.end.dateTime || e.end.date + "T00:00:00Z"),
      }));
  }
  const result = await requestJSON(
    "https://graph.microsoft.com/v1.0/me/calendarView?" +
      new URLSearchParams({
        startDateTime: from.toISOString(),
        endDateTime: to.toISOString(),
        $top: "250",
        $select: "id,start,end,isCancelled,showAs",
      }),
    access,
    { headers: { Prefer: 'outlook.timezone="UTC"' } },
  );
  if (result["@odata.nextLink"])
    fail("Təqvimdə çox görüş var; intervalı daraldın.", 503);
  return (result.value || [])
    .filter((e: any) => !e.isCancelled && e.showAs !== "free")
    .map((e: any) => ({
      id: String(e.id),
      start: new Date(e.start.dateTime + "Z"),
      end: new Date(e.end.dateTime + "Z"),
    }));
}
export async function syncBooking(bookingId: string) {
  const before = await prisma.crmBooking.findUnique({
    where: { id: bookingId },
    select: { companyId: true },
  });
  if (!before) return;
  return tx(async (db) => {
    await lock(db, before.companyId);
    const b = await db.crmBooking.findUnique({
      where: { id: bookingId },
      include: { company: true },
    });
    if (
      !b ||
      !b.company.features.includes("calendar") ||
      b.status === "COMPLETED" ||
      !["TRIAL", "ACTIVE"].includes(state(b.company))
    )
      return;
    const conn = await db.crmConnection.findFirst({
      where: {
        companyId: b.companyId,
        memberId: b.assigneeId,
        channel: "CALENDAR",
        active: true,
      },
    });
    if (!conn) return;
    const access = await credential(conn, db),
      external = b.external as Record<string, unknown>;
    const externalId = String(external.id || "");
    let result: any;
    if (b.status === "CANCELLED") {
      if (!externalId) return;
      await requestJSON(
        conn.provider === "google"
          ? "https://www.googleapis.com/calendar/v3/calendars/primary/events/" +
              encodeURIComponent(externalId)
          : "https://graph.microsoft.com/v1.0/me/events/" +
              encodeURIComponent(externalId),
        access,
        { method: "DELETE" },
      );
      result = { id: externalId, cancelled: true };
    } else if (conn.provider === "google") {
      const deterministic = hash("newera:" + b.id).slice(0, 48);
      result = await requestJSON(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
          (externalId ? "/" + encodeURIComponent(externalId) : ""),
        access,
        {
          method: externalId ? "PATCH" : "POST",
          body: JSON.stringify({
            ...(externalId ? {} : { id: deterministic }),
            summary: b.title,
            start: { dateTime: b.startsAt.toISOString(), timeZone: b.timezone },
            end: { dateTime: b.endsAt.toISOString(), timeZone: b.timezone },
            description: "NEW ERA rezervasiyası: " + b.id,
          }),
        },
      );
    } else
      result = await requestJSON(
        "https://graph.microsoft.com/v1.0/me/events" +
          (externalId ? "/" + encodeURIComponent(externalId) : ""),
        access,
        {
          method: externalId ? "PATCH" : "POST",
          body: JSON.stringify({
            subject: b.title,
            start: { dateTime: b.startsAt.toISOString(), timeZone: "UTC" },
            end: { dateTime: b.endsAt.toISOString(), timeZone: "UTC" },
            ...(externalId ? {} : { transactionId: b.id }),
          }),
        },
      );
    await db.crmBooking.update({
      where: { id: b.id },
      data: {
        external: {
          provider: conn.provider,
          id: String(result.id || externalId),
          syncedAt: new Date().toISOString(),
          startsAt: b.startsAt.toISOString(),
          endsAt: b.endsAt.toISOString(),
        },
      },
    });
  });
}
export async function syncCalendarChanges(
  conn: CrmConnection,
  deadline = Date.now() + 10000,
) {
  const rows = await prisma.crmBooking.findMany({
    where: {
      companyId: conn.companyId,
      assigneeId: conn.memberId,
      status: "CONFIRMED",
      startsAt: { gte: new Date(Date.now() - 86400000) },
      external: { path: ["provider"], equals: conn.provider },
    },
    take: 10,
    orderBy: { updatedAt: "asc" },
  });
  const access = await credential(conn);
  for (const b of rows) {
    if (Date.now() > deadline) break;
    const external = b.external as Record<string, unknown>;
    if (!external.id) continue;
    const e = await requestJSON(
      conn.provider === "google"
        ? "https://www.googleapis.com/calendar/v3/calendars/primary/events/" +
            encodeURIComponent(String(external.id))
        : "https://graph.microsoft.com/v1.0/me/events/" +
            encodeURIComponent(String(external.id)),
      access,
      {
        headers:
          conn.provider === "microsoft"
            ? { Prefer: 'outlook.timezone="UTC"' }
            : {},
      },
    );
    const start = e.start?.dateTime
        ? new Date(
            e.start.dateTime +
              (conn.provider === "microsoft" &&
              !/Z|[+-]\d\d:\d\d$/.test(e.start.dateTime)
                ? "Z"
                : ""),
          )
        : null,
      end = e.end?.dateTime
        ? new Date(
            e.end.dateTime +
              (conn.provider === "microsoft" &&
              !/Z|[+-]\d\d:\d\d$/.test(e.end.dateTime)
                ? "Z"
                : ""),
          )
        : null,
      cancelled = e.status === "cancelled" || e.isCancelled;
    if (
      !cancelled &&
      (!start ||
        !end ||
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()))
    )
      continue;
    await tx(async (db) => {
      const co = await lock(db, b.companyId);
      if (
        !["TRIAL", "ACTIVE"].includes(state(co)) ||
        !co.features.includes("calendar") ||
        !(await db.crmConnection.findFirst({
          where: { id: conn.id, active: true },
        })) ||
        !(await db.crmSeat.findFirst({
          where: { companyId: co.id, id: conn.memberId, active: true },
        }))
      )
        return;
      const fresh = await db.crmBooking.findUnique({ where: { id: b.id } });
      if (!fresh || fresh.updatedAt.getTime() !== b.updatedAt.getTime()) return;
      if (
        cancelled ||
        start!.toISOString() !== external.startsAt ||
        end!.toISOString() !== external.endsAt
      ) {
        await db.crmBooking.update({
          where: { id: b.id },
          data: {
            ...(cancelled
              ? { status: "CANCELLED" }
              : { startsAt: start!, endsAt: end! }),
            external: {
              ...external,
              startsAt: start?.toISOString() || null,
              endsAt: end?.toISOString() || null,
              pulledAt: new Date().toISOString(),
            } as never,
          },
        });
        if (b.calendarEntryId) {
          const calendarEntry = await db.crmEntry.findUnique({
            where: { id: b.calendarEntryId },
          });
          await db.crmEntry.update({
            where: { id: b.calendarEntryId },
            data: {
              ...(cancelled
                ? { status: "CANCELLED" }
                : {
                    dueAt: start!,
                    data: {
                      ...((calendarEntry?.data as Prisma.InputJsonObject) ||
                        {}),
                      durationMinutes: Math.ceil(
                        (end!.getTime() - start!.getTime()) / 60000,
                      ),
                      externalUpdatedAt: new Date().toISOString(),
                    },
                  }),
              version: { increment: 1 },
            },
          });
        }
        await db.crmEvent.create({
          data: {
            companyId: co.id,
            type: "AUDIT",
            entryId: b.calendarEntryId,
            actorType: "SYSTEM",
            data: { action: "CALENDAR_EXTERNAL_CHANGE", bookingId: b.id },
          },
        });
      } else
        await db.crmBooking.update({
          where: { id: b.id },
          data: {
            external: {
              ...external,
              lastCheckedAt: new Date().toISOString(),
            } as never,
          },
        });
    });
  }
}
