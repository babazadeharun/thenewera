import { Prisma } from "@prisma/client";
import { where, permit, entry, type DB, type Context } from "./db";
import { kinds, reports } from "./records";
import { fail, required } from "./policy";
export async function timeline(db: DB, c: Context, id: string) {
  const customer = await entry(db, c, id);
  if (customer.kind !== "customers") fail("Müştəri seçin.");
  const visible = [];
  for (const kind of kinds) {
    try {
      permit(c, kind, "read");
    } catch {
      continue;
    }
    visible.push(
      ...(await db.crmEntry.findMany({
        where: {
          AND: [
            await where(db, c, kind),
            { OR: [{ id }, { customerId: id }, { sale: { customerId: id } }] },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      })),
    );
  }
  const ids = visible.map((e) => e.id);
  const events = await db.crmEvent.findMany({
    where: {
      companyId: c.company.id,
      entryId: { in: ids },
      type: { in: ["AUDIT", "INTERNAL"] },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const files = await db.crmAttachment.findMany({ where: { companyId: c.company.id, entryId: { in: ids } }, select: { id: true, entryId: true, name: true, size: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 });
  return { customer, records: visible, events, files };
}
export async function dashboard(db: DB, c: Context, q: URLSearchParams) {
  permit(c, "reports", "read");
  const report = await reports(db, c, q);
  const scope = async (kind: string) => {
    try {
      return await where(db, c, kind);
    } catch {
      return null;
    }
  };
  const sw = await scope("sales"),
    tw = await scope("tasks"),
    mw = await scope("messages");
  const now = new Date(),
    stale = new Date(Date.now() - 7 * 86400000);
  const [sales, tasks] = await Promise.all([
    sw
      ? db.crmEntry.findMany({
          where: { AND: [sw, { status: "OPEN" }] },
          take: 3000,
        })
      : [],
    tw
      ? db.crmEntry.findMany({
          where: { AND: [tw, { status: { not: "DONE" }, dueAt: { lt: now } }] },
          take: 100,
        })
      : [],
  ]);
  const visibleIds = mw
    ? (await db.crmEntry.findMany({ where: mw, select: { id: true } })).map(
        (e) => e.id,
      )
    : [];
  const grouped = visibleIds.length
    ? await db.$queryRaw<
        { id: string; total: bigint }[]
      >`SELECT (array_agg("id" ORDER BY "createdAt" DESC) FILTER (WHERE "status"='RECEIVED'))[1] AS id, COUNT(*) OVER() AS total FROM "CrmEntry" WHERE "companyId"=${c.company.id} AND "id"=ANY(${visibleIds}::text[]) GROUP BY "data"->>'channel',CASE WHEN "data"->>'channel'='WHATSAPP' THEN regexp_replace("data"->>'to','[^0-9]','','g') ELSE lower("data"->>'to') END HAVING MAX("createdAt") FILTER (WHERE "status"='RECEIVED') > COALESCE(MAX("createdAt") FILTER (WHERE "status"='SENT'),'-infinity'::timestamp) ORDER BY MAX("createdAt") DESC LIMIT 30`
    : [];
  const waiting = grouped.length
    ? await db.crmEntry.findMany({
        where: {
          companyId: c.company.id,
          id: { in: grouped.map((g) => g.id) },
        },
        select: { id: true, title: true, customerId: true, createdAt: true },
      })
    : [];
  const [forecastRows, overdueCount, stalledCount] = await Promise.all([
    sw
      ? db.crmEntry.groupBy({
          by: ["currency"],
          where: { AND: [sw, { status: "OPEN" }] },
          _sum: { amount: true },
        })
      : [],
    tw
      ? db.crmEntry.count({
          where: { AND: [tw, { status: { not: "DONE" }, dueAt: { lt: now } }] },
        })
      : 0,
    sw
      ? db.crmEntry.count({
          where: { AND: [sw, { status: "OPEN", stageAt: { lt: stale } }] },
        })
      : 0,
  ]);
  const forecast = Object.fromEntries(
    forecastRows.map((r) => [r.currency, r._sum.amount?.toFixed(2) || "0.00"]),
  );
  return {
    report,
    attention: {
      counts: {
        unanswered: Number(grouped[0]?.total || 0),
        overdue: overdueCount,
        stalled: stalledCount,
      },
      unanswered: waiting,
      overdue: tasks,
      stalled: sales.filter((s) => s.stageAt < stale).slice(0, 50),
    },
    forecast: {
      type: "UNWEIGHTED_OPEN_PIPELINE",
      amounts: forecast,
      notice:
        "Açıq satışların cəmidir; proqnoz zəmanəti və faktiki daxilolma deyil.",
    },
    sources: await sourceRevenue(db, c, q),
  };
}
async function sourceRevenue(db: DB, c: Context, q: URLSearchParams) {
  let customers, sales, payments;
  try {
    customers = await where(db, c, "customers");
    sales = await where(db, c, "sales");
    payments = await where(db, c, "payments");
  } catch {
    return [];
  }
  const [cs, ss, ps] = await Promise.all([
    db.crmEntry.findMany({ where: customers }),
    db.crmEntry.findMany({ where: sales }),
    db.crmEntry.findMany({
      where: { AND: [payments, { status: "RECORDED" }] },
    }),
  ]);
  const from = q.get("from") ? new Date(q.get("from")!) : null,
    to = q.get("to") ? new Date(q.get("to")! + "T23:59:59Z") : null;
  const data: Record<
    string,
    { source: string; currency: string; received: number; payments: number }
  > = {};
  for (const p of ps) {
    const at = new Date(
      String((p.data as Record<string, unknown>).paidAt || p.createdAt),
    );
    if (
      (from && at < from) ||
      (to && at > to) ||
      (q.get("assigneeId") && p.assigneeId !== q.get("assigneeId"))
    )
      continue;
    const s = ss.find((s) => s.id === p.saleId),
      customer = cs.find((c) => c.id === (p.customerId || s?.customerId));
    if (!customer) continue;
    const source = String(
        (customer.data as Record<string, unknown>).source || "Naməlum",
      ),
      key = source + "|" + p.currency;
    data[key] ??= { source, currency: p.currency, received: 0, payments: 0 };
    data[key].received += Number(p.amount);
    data[key].payments++;
  }
  return Object.values(data);
}
export async function savedViews(
  db: DB,
  c: Context,
  b?: Record<string, unknown>,
) {
  if (!c.member) fail("Şəxsi üzvlük tələb olunur.", 403);
  if (!b)
    return db.crmEvent.findMany({
      where: { companyId: c.company.id, type: "VIEW", userId: c.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  if (b.remove) {
    await db.crmEvent.deleteMany({
      where: {
        companyId: c.company.id,
        type: "VIEW",
        userId: c.user.id,
        id: required(b.id),
      },
    });
    return { ok: true };
  }
  const kind = required(b.kind);
  permit(c, kind, "read");
  if (!kinds.includes(kind)) fail("Bölmə uyğun deyil.");
  const value = {
    name: required(b.name, 80),
    kind,
    q: String(b.q || "").slice(0, 100),
    status: String(b.status || ""),
    assigneeId: String(b.assigneeId || ""),
    pipelineId: String(b.pipelineId || ""),
  };
  return db.crmEvent.upsert({
    where: {
      companyId_key: {
        companyId: c.company.id,
        key: "view:" + c.user.id + ":" + kind + ":" + value.name,
      },
    },
    create: {
      companyId: c.company.id,
      type: "VIEW",
      userId: c.user.id,
      key: "view:" + c.user.id + ":" + kind + ":" + value.name,
      data: value,
    },
    update: { data: value },
  });
}
export async function trash(db: DB, c: Context, b?: Record<string, unknown>) {
  if (!b) {
    const rows = [];
    for (const kind of kinds) {
      try {
        const scope = await where(db, c, kind, "delete");
        rows.push(
          ...(await db.crmEntry.findMany({
            where: { ...scope, deletedAt: { not: null } },
            orderBy: { deletedAt: "desc" },
            take: 50,
          })),
        );
      } catch {}
    }
    return rows;
  }
  const before =
    (await db.crmEntry.findFirst({
      where: {
        companyId: c.company.id,
        id: required(b.id),
        deletedAt: { not: null },
      },
    })) || fail("Silinmiş qeyd tapılmadı.", 404);
  if ((before.data as Record<string, unknown>).mergedInto)
    fail(
      "Birləşdirilmiş kartı adi bərpa ilə ayırmaq olmaz. Birləşdirmə tarixçəsinə baxın.",
      409,
    );
  const scope = await where(db, c, before.kind, "delete");
  if (
    !(await db.crmEntry.findFirst({
      where: {
        AND: [{ ...scope, deletedAt: { not: null } }, { id: before.id }],
      },
    }))
  )
    fail("İcazə yoxdur.", 403);
  const { write, log } = await import("./db");
  write(c, before.kind);
  if (
    (await db.crmEntry.count({
      where: { companyId: c.company.id, deletedAt: null },
    })) >= c.company.records
  )
    fail("Qeyd limiti dolub.", 409);
  for (const parent of [before.customerId, before.saleId])
    if (parent) await entry(db, c, parent);
  if (
    before.kind === "customers" &&
    (before.email || before.phone) &&
    (await db.crmEntry.findFirst({
      where: {
        companyId: c.company.id,
        kind: "customers",
        deletedAt: null,
        OR: [
          ...(before.email ? [{ email: before.email }] : []),
          ...(before.phone ? [{ phone: before.phone }] : []),
        ],
      },
    }))
  )
    fail("Kontakt dublikatı mövcuddur.", 409);
  await db.crmEntry.update({
    where: { id: before.id },
    data: { deletedAt: null, version: { increment: 1 } },
  });
  await log(
    db,
    c.company.id,
    c.user,
    "ENTRY_RESTORED",
    {},
    before.id,
    Boolean(c.support),
  );
  return { ok: true };
}
export async function mergeCustomer(
  db: DB,
  c: Context,
  b: Record<string, unknown>,
) {
  const { write, log } = await import("./db");
  write(c, "customers");
  if (c.member?.role !== "OWNER" && c.support !== "WRITE")
    fail("Birləşdirmə yalnız Owner və təsdiqli dəstək üçün açıqdır.", 403);
  const source = await entry(db, c, required(b.sourceId), "delete"),
    target = await entry(db, c, required(b.targetId), "update");
  if (
    source.kind !== "customers" ||
    target.kind !== "customers" ||
    source.id === target.id ||
    b.confirm !== target.title
  )
    fail("İki müştəri seçib saxlanılacaq müştərinin adını təsdiqləyin.");
  await db.crmEntry.updateMany({
    where: { companyId: c.company.id, customerId: source.id },
    data: { customerId: target.id, version: { increment: 1 } },
  });
  await db.crmThread.updateMany({
    where: { companyId: c.company.id, customerId: source.id },
    data: { customerId: target.id },
  });
  await db.crmBooking.updateMany({
    where: { companyId: c.company.id, customerId: source.id },
    data: { customerId: target.id },
  });
  await db.crmPortalAccess.updateMany({
    where: { companyId: c.company.id, customerId: source.id },
    data: { revokedAt: new Date() },
  });
  await db.crmEntry.update({
    where: { id: source.id },
    data: {
      deletedAt: new Date(),
      data: { ...(source.data as object), mergedInto: target.id },
      version: { increment: 1 },
    },
  });
  await log(
    db,
    c.company.id,
    c.user,
    "CUSTOMER_MERGED",
    {
      sourceId: source.id,
      targetId: target.id,
      originalContact: { email: source.email, phone: source.phone },
    },
    target.id,
    Boolean(c.support),
  );
  return { ok: true };
}
