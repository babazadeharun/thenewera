import { syncCalendarEdit } from "./booking";
import { Prisma } from "@prisma/client";
import { fields, pipeline, prefs, approvalNeeded } from "./preferences";
import { fail, required, str, num, date, quote, type Op } from "./policy";
import {
  write,
  permit,
  where,
  entry,
  seat,
  log,
  notice,
  type DB,
  type Context,
} from "./db";
import { followUp } from "./lead-flow";
import { sourceReport } from "./source-report";
export const kinds = [
  "customers",
  "sales",
  "tasks",
  "calendar",
  "quotes",
  "payments",
  "messages",
];
export const statuses: Record<string, string[]> = {
  customers: ["OPEN", "ACTIVE", "ARCHIVED"],
  sales: ["OPEN", "WON", "LOST"],
  tasks: ["OPEN", "IN_PROGRESS", "DONE"],
  calendar: ["OPEN", "DONE", "CANCELLED"],
  quotes: ["DRAFT", "SENT", "ACCEPTED", "REJECTED"],
  payments: ["RECORDED", "VOID"],
  messages: ["DRAFT", "SENT", "RECEIVED"],
};
export async function list(
  db: DB,
  c: Context,
  kind: string,
  q: URLSearchParams,
  op: Op = "read",
) {
  if (!kinds.includes(kind)) fail("Bölmə yoxdur.", 404);
  const page = Math.max(1, Math.floor(Number(q.get("page")) || 1)),
    search = str(q.get("q"), 100),
    status = str(q.get("status"), 30),
    assigneeId = str(q.get("assigneeId"), 100);
  const from = date(q.get("from")),
    to = date(q.get("to"));
  if (to) to.setUTCHours(23, 59, 59, 999);
  const filter: Prisma.CrmEntryWhereInput = {
    AND: [
      await where(db, c, kind, op),
      search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {},
      status ? { status } : {},
      q.get("pipelineId") ? { pipelineId: q.get("pipelineId")! } : {},
      assigneeId ? { assigneeId } : {},
      from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {},
    ],
  };
  const size = op === "export" ? 10000 : 25;
  const total = await db.crmEntry.count({ where: filter });
  if (op === "export" && total > 10000)
    fail("Filtri daraldın: maksimum 10000 qeyd ixrac edilir.", 422);
  return {
    items: await db.crmEntry.findMany({
      where: filter,
      skip: op === "export" ? 0 : (page - 1) * size,
      take: size,
      orderBy: { createdAt: "desc" },
    }),
    total,
    page,
  };
}
export async function save(
  db: DB,
  c: Context,
  kind: string,
  b: Record<string, unknown>,
  id?: string,
) {
  if (!kinds.includes(kind)) fail("Bölmə yoxdur.", 404);
  write(c, kind);
  const scope = permit(c, kind, id ? "update" : "create");
  const old = id ? await entry(db, c, id, "update") : null;
  if (old && (old.kind !== kind || old.version !== Number(b.version)))
    fail("Qeyd dəyişib. Səhifəni yeniləyin.", 409);
  if (
    !old &&
    (await db.crmEntry.count({
      where: { companyId: c.company.id, deletedAt: null },
    })) >= c.company.records
  )
    fail("Qeyd limiti dolub.", 409);
  const assigneeId = str(b.assigneeId, 100) || c.member?.id || null;
  const participants = Array.isArray(b.participants)
    ? Array.from(new Set(b.participants.map((x) => required(x, 100)))).slice(
        0,
        30,
      )
    : [];
  for (const sid of [...participants, ...(assigneeId ? [assigneeId] : [])]) {
    const s = await seat(db, sid, c.company.id);
    if (scope === "OWN" && s.id !== c.member?.id)
      fail("Yalnız özünüzə təyin edə bilərsiniz.", 403);
    if (
      scope === "TEAM" &&
      s.id !== c.member?.id &&
      (!c.member?.team || s.team !== c.member.team)
    )
      fail("Öz komandanızdan əməkdaş seçin.", 403);
  }
  const customerId = str(b.customerId, 100) || null,
    saleId = str(b.saleId, 100) || null;
  const customer = customerId ? await entry(db, c, customerId) : null,
    sale = saleId ? await entry(db, c, saleId) : null;
  if (
    (customer && customer.kind !== "customers") ||
    (sale && sale.kind !== "sales")
  )
    fail("Əlaqəli qeyd uyğun deyil.");
  if (customer && sale && sale.customerId && customer.id !== sale.customerId)
    fail("Satış başqa müştəriyə aiddir.");
  const data = (
    b.data && typeof b.data === "object" && !Array.isArray(b.data) ? b.data : {}
  ) as Record<string, unknown>;
  const clean: Record<string, Prisma.InputJsonValue> = {
    notes: str(data.notes, 20000),
    portalVisible: data.portalVisible === true,
  };
  let amount = num(b.amount || 0),
    stage: string | null = null;
  const status = required(b.status, 30);
  if (!statuses[kind].includes(status)) fail("Status düzgün deyil.");
  const currency = str(b.currency || "AZN", 3).toUpperCase();
  if (!["AZN", "USD", "EUR", "TRY", "GBP"].includes(currency))
    fail("Valyuta düzgün deyil.");
  if (kind === "customers")
    Object.assign(clean, {
      company: str(data.company),
      person: str(data.person),
      source: str(data.source),
      tags: str(data.tags),
      instagramId: str(data.instagramId, 80),
      messengerId: str(data.messengerId, 80),
    });
  if (kind === "sales") {
    stage = required(b.stage, 80);
    if (!pipeline(c, b.pipelineId || old?.pipelineId).stages.includes(stage))
      fail("Mərhələ düzgün deyil.");
    Object.assign(clean, {
      source: str((old?.data as any)?.source || data.source || (customer?.data as any)?.source),
      nextStep: str(data.nextStep),
      lossReason: str(data.lossReason),
    });
    if (status === "LOST" && !clean.lossReason)
      fail("İtirilmə səbəbini daxil edin.");
  }
  if (kind === "tasks" || kind === "calendar") {
    const priority = str(data.priority || "NORMAL", 20);
    if (!["LOW", "NORMAL", "HIGH", "URGENT"].includes(priority))
      fail("Prioritet düzgün deyil.");
    Object.assign(clean, {
      priority,
      reminderAt: date(data.reminderAt)?.toISOString() || null,
      durationMinutes: Math.max(
        15,
        Math.min(480, Number(data.durationMinutes) || 30),
      ),
    });
  }
  if (kind === "quotes") {
    const totals = quote(data.lines, data.discount);
    Object.assign(clean, totals);
    amount = totals.total;
  }
  if (kind === "payments") {
    if (!sale || sale.currency !== currency)
      fail("Ödəniş eyni valyutada olan satışa bağlanmalıdır.");
    const reference = required(data.reference);
    const dup = await db.crmEntry.findFirst({
      where: {
        companyId: c.company.id,
        kind,
        deletedAt: null,
        ...(id ? { id: { not: id } } : {}),
        data: { path: ["reference"], equals: reference },
      },
    });
    if (dup) fail("Bu ödəniş istinadı artıq qeydə alınıb.", 409);
    Object.assign(clean, {
      reference,
      paidAt: (date(data.paidAt) || new Date()).toISOString(),
    });
  }
  if (kind === "messages") {
    if (old && (old.data as Record<string, unknown>).delivery)
      fail("Göndərilən və ya yoxlama tələb edən mesaj dəyişdirilmir.");
    if (status !== "DRAFT" && status !== old?.status)
      fail("Göndərmə ayrıca təsdiq tələb edir.");
    const channel = str(data.channel || "EMAIL", 20);
    if (!["EMAIL", "WHATSAPP", "INSTAGRAM", "MESSENGER"].includes(channel))
      fail("Kanal düzgün deyil.");
    Object.assign(clean, {
      channel,
      to:
        channel === "EMAIL"
          ? required(data.to).toLowerCase()
          : channel === "WHATSAPP"
            ? required(data.to).replace(/\D/g, "")
            : required(data.to),
      body: required(data.body, 20000),
    });
  }
  const email =
      kind === "customers" ? str(b.email).toLowerCase() || null : null,
    phone =
      kind === "customers"
        ? str(b.phone, 40).replace(/[\s().-]/g, "") || null
        : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail("E-poçt düzgün deyil.");
  if (
    kind === "customers" &&
    (email || phone) &&
    (await db.crmEntry.findFirst({
      where: {
        companyId: c.company.id,
        kind,
        deletedAt: null,
        ...(id ? { id: { not: id } } : {}),
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    }))
  )
    fail("Bu e-poçt və ya telefonla müştəri artıq mövcuddur.", 409);
  const custom = {
    ...((old?.custom as Record<string, Prisma.InputJsonValue>) || {}),
    ...fields(c, kind, b.custom ?? old?.custom),
  };
  const pipelineId =
    kind === "sales" ? pipeline(c, b.pipelineId || old?.pipelineId).id : "main";
  if (kind === "sales") {
    for (const gate of prefs(c).gates || [])
      if (gate.pipelineId === pipelineId && gate.stage === stage)
        for (const key of gate.fields)
          if (
            !(
              {
                nextStep: clean.nextStep,
                customerId,
                dueAt: b.dueAt,
                ...custom,
              } as Record<string, unknown>
            )[key]
          )
            fail("Mərhələyə keçmək üçün " + key + " sahəsi tələb olunur.");
  }
  const values = {
    custom,
    pipelineId,
    title: required(b.title),
    status,
    stage,
    assigneeId,
    participants,
    customerId: customerId || sale?.customerId || null,
    saleId,
    amount,
    currency,
    dueAt: date(b.dueAt),
    email,
    phone,
    data: clean,
  };
  if (
    kind === "quotes" &&
    ["SENT", "ACCEPTED"].includes(status) &&
    (await approvalNeeded(db, c, { ...values, id: old?.id }))
  )
    fail(
      "Bu təklif rəhbər təsdiqi tələb edir. Əvvəl DRAFT kimi saxlayıb təsdiq sorğusu göndərin.",
      409,
    );
  if (old && kind === "calendar") await syncCalendarEdit(db, c, old, values);
  const item = old
    ? await db.crmEntry.update({
        where: { id: old.id },
        data: {
          ...values,
          version: { increment: 1 },
          ...(old.stage !== stage ? { stageAt: new Date() } : {}),
        },
      })
    : await db.crmEntry.create({
        data: { ...values, companyId: c.company.id, kind, authorId: c.user.id },
      });
  await log(
    db,
    c.company.id,
    c.user,
    old ? "ENTRY_UPDATED" : "ENTRY_CREATED",
    {
      kind,
      oldStage: old?.stage || null,
      stage,
      oldAmount: old?.amount.toString() || null,
      amount: item.amount.toString(),
      currency,
    },
    item.id,
    Boolean(c.support),
  );
  await db.crmCompany.update({
    where: { id: c.company.id },
    data: { lastActivity: new Date() },
  });
  if (assigneeId && old?.assigneeId !== assigneeId) {
    const s = await seat(db, assigneeId, c.company.id);
    await notice(
      db,
      c.company.id,
      s.userId,
      `assignment:${item.id}:${item.version}`,
      "Sizə yeni qeyd təyin edildi.",
    );
  }
  if (!old || old.stage !== stage)
    await automate(db, c, item, !old ? "CREATED" : "STAGE_CHANGED");
  if (kind === "quotes" && status === "SENT" && old?.status !== "SENT") await followUp(db, c, item);
  return (await db.crmEntry.findUnique({ where: { id: item.id } }))!;
}
export async function automate(
  db: DB,
  c: Context,
  item: { id: string; kind: string; stage: string | null; version: number },
  trigger: string,
) {
  if (
    !["TRIAL", "ACTIVE"].includes(c.state) ||
    !c.company.features.includes("automation")
  )
    return;
  const rules = await db.crmAutomation.findMany({
    where: {
      companyId: c.company.id,
      active: true,
      trigger,
      ...(trigger === "STAGE_CHANGED" ? { stage: item.stage } : {}),
    },
  });
  for (const r of rules) {
    if (r.action === "ASSIGN" && item.kind !== "customers") continue;
    const key = `run:${r.id}:${item.id}:${item.version}:${trigger}`;
    if (
      await db.crmEvent.findUnique({
        where: { companyId_key: { companyId: c.company.id, key } },
      })
    )
      continue;
    const author = await db.crmSeat.findUnique({
        where: {
          companyId_userId: { companyId: c.company.id, userId: r.authorId },
        },
      }),
      target = await db.crmSeat.findFirst({
        where: { id: r.assigneeId, companyId: c.company.id, active: true },
      });
    let error = "";
    if (!author?.active || author.role !== "OWNER" || !target)
      error = "Müəllif və ya məsul əməkdaş artıq aktiv deyil.";
    else if (r.action === "TASK") {
      if (
        !c.company.features.includes("tasks") ||
        (await db.crmEntry.count({
          where: { companyId: c.company.id, deletedAt: null },
        })) >= c.company.records
      )
        error = "Plan və ya qeyd limiti.";
      else
        await db.crmEntry.create({
          data: {
            companyId: c.company.id,
            kind: "tasks",
            title: r.title,
            status: "OPEN",
            authorId: r.authorId,
            assigneeId: target.id,
            customerId: item.kind === "customers" ? item.id : null,
            saleId: item.kind === "sales" ? item.id : null,
            dueAt: new Date(Date.now() + 86400000),
            data: {
              priority: "NORMAL",
              notes: "Avtomatlaşdırma ilə yaradılıb.",
            },
          },
        });
    } else if (r.action === "ASSIGN")
      await db.crmEntry.update({
        where: { id: item.id },
        data: { assigneeId: target.id, version: { increment: 1 } },
      });
    else if (r.action === "NOTIFY")
      await notice(
        db,
        c.company.id,
        target.userId,
        key + ":notice",
        "CRM qaydanız üzrə bildiriş var.",
      );
    await db.crmEvent.create({
      data: {
        companyId: c.company.id,
        type: "RUN",
        key,
        actorId: r.authorId,
        actorType: "SYSTEM",
        entryId: item.id,
        data: { ruleId: r.id, status: error ? "ERROR" : "DONE", error },
      },
    });
  }
}
export async function reports(db: DB, c: Context, q: URLSearchParams) {
  permit(c, "reports", "read");
  if (!c.company.features.includes("reports"))
    fail("Hesabat planınıza daxil deyil.", 403);
  const out: Record<string, unknown> = {};
  const loaded: Record<
    string,
    Awaited<ReturnType<DB["crmEntry"]["findMany"]>>
  > = {};
  for (const kind of kinds) {
    try {
      permit(c, kind, "read");
    } catch {
      continue;
    }
    const from = date(q.get("from")),
      to = date(q.get("to"));
    if (to) to.setUTCHours(23, 59, 59, 999);
    loaded[kind] = await db.crmEntry.findMany({
      where: {
        AND: [
          await where(db, c, kind),
          from || to
            ? {
                createdAt: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lte: to } : {}),
                },
              }
            : {},
          q.get("assigneeId") ? { assigneeId: q.get("assigneeId")! } : {},
        ],
      },
    });
  }
  const sales = loaded.sales || [],
    payments = loaded.payments || [];
  const totals = (rows: typeof sales) =>
    Object.fromEntries(
      Array.from(new Set(rows.map((x) => x.currency))).map((cur) => [
        cur,
        num(
          rows
            .filter((x) => x.currency === cur)
            .reduce((s, x) => s + Number(x.amount), 0),
          1e16,
        ),
      ]),
    );
  if (loaded.sales)
    Object.assign(out, {
      sales: sales.length,
      won: sales.filter((x) => x.status === "WON").length,
      conversion: sales.length
        ? Math.round(
            (sales.filter((x) => x.status === "WON").length / sales.length) *
              100,
          )
        : 0,
      wonAmounts: totals(sales.filter((x) => x.status === "WON")),
      stageWait: sales
        .filter((x) => x.status === "OPEN")
        .map((x) => ({
          title: x.title,
          stage: x.stage,
          days: Math.floor((Date.now() - x.stageAt.getTime()) / 86400000),
        })),
      employees: sales.reduce<Record<string, { total: number; won: number }>>(
        (a, x) => {
          const id = x.assigneeId || "unassigned";
          a[id] ??= { total: 0, won: 0 };
          a[id].total++;
          if (x.status === "WON") a[id].won++;
          return a;
        },
        {},
      ),
    });
  if (loaded.payments)
    out.received = totals(payments.filter((x) => x.status === "RECORDED"));
  if (loaded.sales && loaded.payments)
    out.balances = sales.map((s) => {
      const received = payments
        .filter(
          (p) =>
            p.saleId === s.id &&
            p.status === "RECORDED" &&
            p.currency === s.currency,
        )
        .reduce((a, p) => a + Number(p.amount), 0);
      return {
        title: s.title,
        currency: s.currency,
        agreed: Number(s.amount),
        received,
        balance: Number(s.amount) - received,
      };
    });
  if (loaded.customers)
    out.sources = loaded.customers.reduce<Record<string, number>>((a, x) => {
      const key = String(
        (x.data as Record<string, unknown>).source || "Naməlum",
      );
      a[key] = (a[key] || 0) + 1;
      return a;
    }, {});
  out.sourceConversion = await sourceReport(db, c, q);
  out.overdue = (loaded.tasks || []).filter(
    (x) => x.status !== "DONE" && x.dueAt && x.dueAt < new Date(),
  ).length;
  return out;
}
