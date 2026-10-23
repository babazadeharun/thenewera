import { Prisma } from "@prisma/client";
import {
  permit,
  write,
  entry,
  where,
  seat,
  log,
  type Context,
  type DB,
} from "./db";
import { fail, required, str, grant } from "./policy";
import { prefs } from "./preferences";
export async function thread(db: DB, c: Context, messageId: string) {
  const m = await entry(db, c, messageId);
  if (m.kind !== "messages") fail("Mesaj seçin.");
  const d = m.data as Record<string, unknown>,
    channel = String(d.channel),
    contact =
      channel === "WHATSAPP"
        ? String(d.to).replace(/\D/g, "")
        : String(d.to).toLowerCase();
  const t = (await db.crmThread.findUnique({
    where: {
      companyId_channel_contact: { companyId: c.company.id, channel, contact },
    },
  })) || {
    id: "pending",
    companyId: c.company.id,
    channel,
    contact,
    title: m.title,
    customerId: m.customerId,
    assigneeId: m.assigneeId,
    status: "OPEN",
    claimedBy: null,
    claimUntil: null,
    lastInboundAt: m.status === "RECEIVED" ? m.createdAt : null,
    lastOutboundAt: m.status === "SENT" ? m.createdAt : null,
    responseDueAt:
      m.status === "RECEIVED"
        ? new Date(m.createdAt.getTime() + (prefs(c).slaMinutes || 30) * 60000)
        : null,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
  return { m, t };
}
function contactWhere(channel: string, contact: string) {
  return channel === "WHATSAPP"
    ? {
        OR: [
          { data: { path: ["to"], equals: contact } },
          { data: { path: ["to"], equals: "+" + contact } },
        ],
      }
    : { data: { path: ["to"], equals: contact } };
}
export async function threads(db: DB, c: Context, q: URLSearchParams) {
  const visible = await db.crmEntry.findMany({
    where: await where(db, c, "messages"),
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  const seen = new Set<string>(),
    rows = [];
  for (const m of visible) {
    const d = m.data as Record<string, unknown>,
      key =
        String(d.channel) +
        "|" +
        (d.channel === "WHATSAPP"
          ? String(d.to).replace(/\D/g, "")
          : String(d.to).toLowerCase());
    if (seen.has(key)) continue;
    seen.add(key);
    if (rows.length >= 100) break;
    const t = await thread(db, c, m.id);
    if (q.get("status") && t.t.status !== q.get("status")) continue;
    rows.push({
      ...t.t,
      messageId: m.id,
      lastMessage: String(d.body || "").slice(0, 200),
      lastStatus: m.status,
      overdue: Boolean(
        t.t.responseDueAt &&
          t.t.responseDueAt < new Date() &&
          (!t.t.lastOutboundAt ||
            !t.t.lastInboundAt ||
            t.t.lastOutboundAt < t.t.lastInboundAt),
      ),
    });
  }
  return {
    items: rows,
    quickReplies: prefs(c).quickReplies || [],
    limit: 2000,
  };
}
export async function conversation(db: DB, c: Context, id: string) {
  const { m, t } = await thread(db, c, id);
  const messages = await db.crmEntry.findMany({
    where: {
      AND: [
        await where(db, c, "messages"),
        { data: { path: ["channel"], equals: t.channel } },
        contactWhere(t.channel, t.contact),
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  const notes = await db.crmEvent.findMany({
    where: {
      companyId: c.company.id,
      type: "INTERNAL",
      entryId: { in: messages.map((m) => m.id) },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return {
    thread: t,
    messages,
    notes,
    claimActive: Boolean(t.claimUntil && t.claimUntil > new Date()),
    readOnly: c.support === "READ",
  };
}
export async function act(db: DB, c: Context, b: Record<string, unknown>) {
  write(c, "messages");
  const { m, t } = await thread(db, c, required(b.messageId));
  await entry(db, c, m.id, "update");
  if (t.id === "pending") {
    const stored = await db.crmThread.create({
      data: {
        companyId: t.companyId,
        channel: t.channel,
        contact: t.contact,
        title: t.title,
        customerId: t.customerId,
        assigneeId: t.assigneeId,
        lastInboundAt: t.lastInboundAt,
        responseDueAt: t.responseDueAt,
      },
    });
    t.id = stored.id;
  }
  const op = required(b.action);
  if (op === "claim") {
    if (!c.member) fail("Üzvlük tələb olunur.", 403);
    if (
      t.claimedBy &&
      t.claimedBy !== c.member.id &&
      t.claimUntil &&
      t.claimUntil > new Date()
    )
      fail("Bu yazışmaya başqa əməkdaş cavab hazırlayır.", 409);
    await db.crmThread.update({
      where: { id: t.id },
      data: {
        claimedBy: c.member.id,
        claimUntil: new Date(Date.now() + 120000),
      },
    });
  } else if (op === "release") {
    if (t.claimedBy !== c.member?.id)
      fail("Yazışmanı yalnız götürən əməkdaş buraxa bilər.", 403);
    await db.crmThread.update({
      where: { id: t.id },
      data: { claimedBy: null, claimUntil: null },
    });
  } else if (op === "assign") {
    const target = await seat(db, required(b.assigneeId), c.company.id),
      scope = permit(c, "messages", "update");
    if (grant(target.role, "messages", "read", target.grants) === "NONE" || grant(target.role, "messages", "update", target.grants) === "NONE") fail("Əməkdaşın mesajlara cavab icazəsi yoxdur.", 403);
    if (
      (scope === "OWN" && target.id !== c.member?.id) ||
      (scope === "TEAM" &&
        target.id !== c.member?.id &&
        (!c.member?.team || target.team !== c.member.team))
    )
      fail("Təyinetmə əhatəsi uyğun deyil.", 403);
    if (t.customerId) {
      const customer = await entry(db, c, t.customerId, "update");
      for (const kind of ["customers", "sales"]) {
        const resourceScope = permit(c, kind, "update");
        if ((resourceScope === "OWN" && target.id !== c.member?.id) || (resourceScope === "TEAM" && target.id !== c.member?.id && (!c.member?.team || target.team !== c.member.team))) fail("CRM təyinatı əhatəsi uyğun deyil.", 403);
      }
      await db.crmEntry.update({ where: { id: customer.id }, data: { assigneeId: target.id, version: { increment: 1 } } });
      const visibleSales = await where(db, c, "sales", "update");
      await db.crmEntry.updateMany({ where: { AND: [visibleSales, { customerId: customer.id, status: "OPEN" }] }, data: { assigneeId: target.id, version: { increment: 1 } } });
    }
    await db.crmThread.update({
      where: { id: t.id },
      data: { assigneeId: target.id },
    });
    const visible = await where(db, c, "messages", "update");
    await db.crmEntry.updateMany({
      where: {
        AND: [
          visible,
          { data: { path: ["channel"], equals: t.channel } },
          contactWhere(t.channel, t.contact),
        ],
      },
      data: { assigneeId: target.id, version: { increment: 1 } },
    });
  } else if (op === "link") {
    const customer = await entry(db, c, required(b.customerId), "update");
    if (customer.kind !== "customers") fail("Müştəri seçin.");
    const visible = await where(db, c, "messages", "update");
    await db.crmEntry.updateMany({
      where: {
        AND: [
          visible,
          { data: { path: ["channel"], equals: t.channel } },
          contactWhere(t.channel, t.contact),
        ],
      },
      data: { customerId: customer.id, version: { increment: 1 } },
    });
    await db.crmThread.update({
      where: { id: t.id },
      data: { customerId: customer.id },
    });
    if (["INSTAGRAM","MESSENGER"].includes(t.channel))
      await db.crmEntry.update({
        where: { id: customer.id },
        data: {
          data: { ...(customer.data as object), [t.channel === "INSTAGRAM" ? "instagramId" : "messengerId"]: t.contact },
          version: { increment: 1 },
        },
      });
  } else if (op === "note") {
    await db.crmEvent.create({
      data: {
        companyId: c.company.id,
        type: "INTERNAL",
        entryId: m.id,
        actorId: c.user.id,
        actorType: c.support ? "PLATFORM" : "MEMBER",
        data: { text: required(b.text, 5000) },
      },
    });
  } else if (op === "status") {
    if (!["OPEN", "WAITING", "CLOSED"].includes(String(b.status)))
      fail("Status düzgün deyil.");
    await db.crmThread.update({
      where: { id: t.id },
      data: { status: String(b.status) },
    });
  } else fail("Əməliyyat uyğun deyil.");
  await log(
    db,
    c.company.id,
    c.user,
    "INBOX_" + op.toUpperCase(),
    op === "assign" ? { assigneeId: required(b.assigneeId) } : op === "link" ? { customerId: required(b.customerId) } : {},
    m.id,
    Boolean(c.support),
  );
  return { ok: true };
}
