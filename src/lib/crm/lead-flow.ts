import type { CrmCompany, CrmEntry, Prisma } from "@prisma/client";
import { notice, hash, type DB, type Context } from "./db";
import { fail, grant, state } from "./policy";

export type LeadFlow = {
  enabled?: boolean;
  assignment?: "OWNER" | "ROUND_ROBIN";
  memberIds?: string[];
  escalationMinutes?: number;
  followUpDays?: number;
};
export const flow = (company: CrmCompany): LeadFlow =>
  (company.preferences as { leadFlow?: LeadFlow }).leadFlow || {};
export const phoneKey = (value: string) => value.replace(/\D/g, "").replace(/^00/, "");
export const contactKey = (channel: string, value: string) =>
  channel === "WHATSAPP" ? phoneKey(value) : value.trim().toLowerCase();
const sourceName = (channel: string) => ({ EMAIL: "Email", WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", MESSENGER: "Facebook", FORM: "Sayt" }[channel] || channel);
async function capacity(db: DB, co: CrmCompany, extra = 1) {
  if ((await db.crmEntry.count({ where: { companyId: co.id, deletedAt: null } })) + extra > co.records)
    fail("Qeyd limiti dolub.", 409);
}
async function audit(db: DB, companyId: string, entryId: string, action: string, detail: Prisma.InputJsonObject = {}) {
  await db.crmEvent.create({ data: { companyId, entryId, type: "AUDIT", actorType: "SYSTEM", data: { action, detail } } });
}
// Call only while holding the company row lock. Ingress retries and assignment are atomic.
export async function inboundLead(db: DB, co: CrmCompany, input: {
  channel: string; contact: string; title?: string; email?: string; phone?: string;
  source?: string; fallbackId: string;
}) {
  const channel = input.channel, contact = contactKey(channel, input.contact), cfg = flow(co);
  const existingThread = await db.crmThread.findUnique({ where: { companyId_channel_contact: { companyId: co.id, channel, contact } } });
  const email = (input.email || (channel === "EMAIL" ? contact : "")).trim().toLowerCase();
  const phone = phoneKey(input.phone || (channel === "WHATSAPP" ? contact : ""));
  const matches: Prisma.CrmEntryWhereInput[] = [];
  if (existingThread?.customerId) matches.push({ id: existingThread.customerId });
  if (email) matches.push({ email: { equals: email, mode: "insensitive" } });
  if (phone) {
    const ids = await db.$queryRaw<{ id: string }[]>`SELECT "id" FROM "CrmEntry" WHERE "companyId"=${co.id} AND "kind"='customers' AND "deletedAt" IS NULL AND regexp_replace(regexp_replace(COALESCE("phone",''),'[^0-9]','','g'),'^00','')=${phone}`;
    if (ids.length) matches.push({ id: { in: ids.map(x => x.id) } });
  }
  if (["INSTAGRAM", "MESSENGER"].includes(channel)) matches.push({ data: { path: [channel === "INSTAGRAM" ? "instagramId" : "messengerId"], equals: contact } });
  const candidates = matches.length ? await db.crmEntry.findMany({ where: { companyId: co.id, kind: "customers", deletedAt: null, OR: matches }, orderBy: { createdAt: "asc" } }) : [];
  // Conflicting contacts need a human decision; never merge separate people automatically.
  let customer = existingThread?.customerId ? candidates.find(x => x.id === existingThread.customerId) : candidates.length === 1 ? candidates[0] : undefined;
  const conflict = candidates.length > 1;
  const seats = await db.crmSeat.findMany({ where: { companyId: co.id, active: true }, orderBy: { id: "asc" } });
  const usable = (id: string) => seats.find(s => s.id === id && ["customers", "sales", "messages"].every(k => grant(s.role, k, "read", s.grants) !== "NONE" && grant(s.role, k, "update", s.grants) !== "NONE"));
  let assignee = usable(customer?.assigneeId || "") || usable(existingThread?.assigneeId || "");
  if (!assignee && cfg.enabled && cfg.assignment === "ROUND_ROBIN") {
    const pool = seats.filter(s => cfg.memberIds?.includes(s.id) && usable(s.id));
    if (pool.length) {
      const cursor = await db.crmEvent.findUnique({ where: { companyId_key: { companyId: co.id, key: "lead-routing-cursor" } } });
      const last = String((cursor?.data as any)?.lastId || ""), index = pool.findIndex(s => s.id === last);
      assignee = pool[(index + 1) % pool.length];
      await db.crmEvent.upsert({ where: { companyId_key: { companyId: co.id, key: "lead-routing-cursor" } }, create: { companyId: co.id, type: "FLOW", key: "lead-routing-cursor", actorType: "SYSTEM", data: { lastId: assignee.id } }, update: { data: { lastId: assignee.id } } });
    }
  }
  assignee ||= usable(input.fallbackId) || seats.find(s => s.role === "OWNER") || fail("Aktiv məsul əməkdaş yoxdur.", 409);
  if (customer && cfg.enabled && customer.assigneeId !== assignee.id && !usable(customer.assigneeId || "")) {
    customer = await db.crmEntry.update({ where: { id: customer.id }, data: { assigneeId: assignee.id, version: { increment: 1 } } });
    await db.crmEntry.updateMany({ where: { companyId: co.id, kind: "sales", customerId: customer.id, deletedAt: null, status: "OPEN" }, data: { assigneeId: assignee.id, version: { increment: 1 } } });
    await audit(db, co.id, customer.id, "LEAD_REASSIGNED", { assigneeId: assignee.id });
  }
  let sale: CrmEntry | null = null;
  if (cfg.enabled && !conflict && co.features.includes("customers")) {
    if (!customer) {
      await capacity(db, co, 2); // Reserve the inbound message as well.
      customer = await db.crmEntry.create({ data: {
        companyId: co.id, kind: "customers", title: (input.title || contact).slice(0, 200), status: "OPEN", authorId: "SYSTEM", assigneeId: assignee.id,
        email: email || null, phone: phone ? "+" + phone : null,
        data: { source: (input.source || sourceName(channel)).slice(0, 200), ...(channel === "INSTAGRAM" ? { instagramId: contact } : {}), ...(channel === "MESSENGER" ? { messengerId: contact } : {}) },
      } });
      await audit(db, co.id, customer.id, "LEAD_CUSTOMER_CREATED", { channel });
    }
    if (co.features.includes("sales")) {
      sale = await db.crmEntry.findFirst({ where: { companyId: co.id, kind: "sales", customerId: customer.id, status: "OPEN", deletedAt: null }, orderBy: { createdAt: "asc" } });
      // One acquisition sale per customer; repeat messages after a win/loss do not create new deals.
      const acquired = await db.crmEvent.findUnique({ where: { companyId_key: { companyId: co.id, key: "lead-acquisition:" + customer.id } } });
      if (!sale && !acquired) {
        await capacity(db, co, 2);
        sale = await db.crmEntry.create({ data: { companyId: co.id, kind: "sales", customerId: customer.id, title: customer.title + " — yeni müraciət", status: "OPEN", stage: co.stages[0], authorId: "SYSTEM", assigneeId: assignee.id, data: { source: String((customer.data as any).source || input.source || sourceName(channel)), nextStep: "Müraciəti cavablandırın" } } });
        await audit(db, co.id, sale.id, "LEAD_SALE_CREATED", { channel });
      }
      if (!acquired) await db.crmEvent.create({ data: { companyId: co.id, key: "lead-acquisition:" + customer.id, type: "FLOW", entryId: sale?.id, actorType: "SYSTEM", data: { customerId: customer.id } } });
    }
  }
  if (cfg.enabled && customer && !existingThread && !conflict) await notice(db, co.id, assignee.userId, "lead-assigned:" + customer.id + ":" + channel, "Sizə yeni müraciət təyin edildi. Vahid mesaj qutusunu yoxlayın.");
  if (cfg.enabled && conflict) for (const owner of seats.filter(s => s.role === "OWNER")) await notice(db, co.id, owner.userId, "lead-conflict:" + hash(channel + ":" + contact) + ":" + owner.id, "Müraciətdə kontakt uyğunluğu qeyri-müəyyəndir. Yazışmanı əl ilə müştəriyə bağlayın.");
  return { customer, sale, assigneeId: assignee.id, contact, conflict };
}

export async function followUp(db: DB, c: Context, quote: CrmEntry) {
  const cfg = flow(c.company);
  if (!cfg.enabled || !cfg.followUpDays || !c.company.features.includes("tasks")) return;
  const key = "quote-follow-up:" + quote.id;
  if (await db.crmEvent.findUnique({ where: { companyId_key: { companyId: c.company.id, key } } })) return;
  const assignee = await db.crmSeat.findFirst({ where: { companyId: c.company.id, id: quote.assigneeId || "", active: true } });
  if (!assignee || grant(assignee.role, "tasks", "read", assignee.grants) === "NONE") return;
  await capacity(db, c.company);
  const due = new Date(Date.now() + cfg.followUpDays * 86400000);
  const task = await db.crmEntry.create({ data: { companyId: c.company.id, kind: "tasks", title: "Təklif üzrə yenidən əlaqə: " + quote.title, status: "OPEN", customerId: quote.customerId, saleId: quote.saleId, assigneeId: assignee.id, authorId: "SYSTEM", dueAt: due, data: { priority: "NORMAL", reminderAt: due.toISOString(), quoteId: quote.id, notes: "Göndərilmiş təklifin nəticəsini öyrənin." } } });
  await db.crmEvent.create({ data: { companyId: c.company.id, key, type: "FLOW", entryId: quote.id, actorType: "SYSTEM", data: { taskId: task.id } } });
  await audit(db, c.company.id, task.id, "QUOTE_FOLLOW_UP_CREATED", { quoteId: quote.id });
  await notice(db, c.company.id, assignee.userId, key + ":assigned", "Göndərilmiş təklif üzrə əlaqə tapşırığı yaradıldı.");
}

export async function unanswered(db: DB, co: CrmCompany, now = new Date(), limit = 100) {
  if (!flow(co).enabled || !["ACTIVE", "TRIAL"].includes(state(co)) || !co.features.includes("messages")) return;
  const rows = await db.crmThread.findMany({ where: { companyId: co.id, status: "OPEN", responseDueAt: { lte: now } }, orderBy: [{ responseDueAt: "asc" }, { id: "asc" }] });
  const owners = await db.crmSeat.findMany({ where: { companyId: co.id, active: true, role: "OWNER" } });
  let processed = 0;
  for (const t of rows) {
    if (!t.lastInboundAt || (t.lastOutboundAt && t.lastOutboundAt >= t.lastInboundAt)) continue;
    const start = `sla:${t.id}:${t.responseDueAt!.toISOString()}`;
    const assigned = await db.crmSeat.findFirst({ where: { companyId: co.id, id: t.assigneeId || "", active: true } });
    const recipients = assigned && grant(assigned.role, "messages", "read", assigned.grants) !== "NONE" ? [assigned] : owners;
    const escalated = now.getTime() >= t.responseDueAt!.getTime() + (flow(co).escalationMinutes ?? 30) * 60000;
    const targets = [...recipients, ...(escalated ? owners : [])];
    let changed = false;
    for (const s of new Map(targets.map(s => [s.id, s])).values()) {
      const key = start + ":" + s.id;
      if (await db.crmEvent.findUnique({ where: { companyId_key: { companyId: co.id, key } } })) continue;
      await notice(db, co.id, s.userId, key, `${t.channel}: cavabsız müraciət var. Vahid mesaj qutusunu yoxlayın.`);
      changed = true;
    }
    // Already notified threads do not consume the batch; later threads cannot starve.
    if (changed && ++processed >= limit) break;
  }
}
