import { timingSafeEqual } from "node:crypto";
import { tx, lock, hash, token, permit, write, log, type DB, type Context } from "./db";
import { fail, required, str, state } from "./policy";
import { inboundLead, flow } from "./lead-flow";
export async function intakeKey(db: DB, c: Context, b: Record<string, unknown>) {
  permit(c, "settings", "update"); write(c);
  const raw = b.revoke === true ? "" : token();
  await db.crmEvent.upsert({ where: { companyId_key: { companyId: c.company.id, key: "form-intake-secret" } }, create: { companyId: c.company.id, key: "form-intake-secret", type: "SECRET", data: { hash: raw ? hash(raw) : "" } }, update: { data: { hash: raw ? hash(raw) : "" } } });
  await log(db, c.company.id, c.user, raw ? "INTAKE_KEY_ROTATED" : "INTAKE_KEY_REVOKED", {}, undefined, Boolean(c.support));
  return { key: raw, path: "/api/workspace-intake/" + c.company.id };
}
export async function receiveForm(companyId: string, bearer: string, b: Record<string, unknown>) {
  return tx(async db => {
    const co = await lock(db, companyId);
    const key = await db.crmEvent.findUnique({ where: { companyId_key: { companyId, key: "form-intake-secret" } } });
    const expected = String((key?.data as any)?.hash || ""), actual = hash(bearer);
    if (!expected || !bearer || expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) fail("İcazə yoxdur.", 403);
    if (!["ACTIVE", "TRIAL"].includes(state(co)) || !flow(co).enabled || !["messages", "customers", "sales"].every(k => co.features.includes(k))) fail("Müraciət qəbulu aktiv deyil.", 403);
    const requestId = required(b.requestId, 200), eventKey = "form:" + hash(requestId);
    if (await db.crmEvent.findUnique({ where: { companyId_key: { companyId, key: eventKey } } })) return { ok: true, duplicate: true };
    if (await db.crmEvent.count({ where: { companyId, type: "FORM", createdAt: { gt: new Date(Date.now() - 60000) } } }) >= 60) fail("Müraciət limiti. Sonra yenidən cəhd edin.", 429);
    const email = str(b.email, 254).toLowerCase(), phone = str(b.phone, 40);
    if ((!email && !phone) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || (phone && !/^\+?[\d ()-]{7,40}$/.test(phone))) fail("Düzgün email və ya telefon daxil edin.");
    const owner = await db.crmSeat.findFirst({ where: { companyId, role: "OWNER", active: true } });
    if (!owner) fail("Məsul əməkdaş yoxdur.", 409);
    const title = required(b.name), lead = await inboundLead(db, co, { channel: "FORM", contact: email || phone, email, phone, title, source: str(b.source, 200) || "Sayt", fallbackId: owner.id });
    if (lead.conflict) fail("Kontaktlar fərqli müştərilərə aiddir. Əl ilə yoxlayın.", 409);
    if ((await db.crmEntry.count({ where: { companyId, deletedAt: null } })) >= co.records) fail("Qeyd limiti dolub.", 409);
    const at = new Date(), due = new Date(at.getTime() + (Number((co.preferences as any).slaMinutes) || 30) * 60000);
    const existing = await db.crmThread.findUnique({ where: { companyId_channel_contact: { companyId, channel: "FORM", contact: lead.contact } } });
    const message = await db.crmEntry.create({ data: { companyId, kind: "messages", title: title + " — sayt müraciəti", status: "RECEIVED", authorId: "SYSTEM", assigneeId: lead.assigneeId, customerId: lead.customer?.id, saleId: lead.sale?.id, data: { channel: "FORM", to: lead.contact, body: required(b.message, 20000), delivery: "RECEIVED" } } });
    await db.crmThread.upsert({ where: { companyId_channel_contact: { companyId, channel: "FORM", contact: lead.contact } }, create: { companyId, channel: "FORM", contact: lead.contact, title, customerId: lead.customer?.id, assigneeId: lead.assigneeId, lastInboundAt: at, responseDueAt: due }, update: { status: "OPEN", customerId: lead.customer?.id, assigneeId: lead.assigneeId, lastInboundAt: at, responseDueAt: existing?.responseDueAt || due } });
    await db.crmEvent.create({ data: { companyId, key: eventKey, type: "FORM", entryId: message.id, actorType: "SYSTEM", data: { action: "FORM_RECEIVED" } } });
    return { ok: true, duplicate: false };
  });
}
