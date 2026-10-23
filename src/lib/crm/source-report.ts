import { where, permit, type DB, type Context } from "./db";
import { date, fail, CRMError } from "./policy";
export async function sourceReport(db: DB, c: Context, q: URLSearchParams) {
  permit(c, "reports", "read");
  const from = date(q.get("from")), to = date(q.get("to"));
  if (to) to.setUTCHours(23,59,59,999);
  if (from && to && from > to) fail("Tarix aralığı düzgün deyil.");
  let cw, sw;
  try { cw = await where(db, c, "customers"); sw = await where(db, c, "sales"); } catch (e) { if (!(e instanceof CRMError) || e.status !== 403) throw e; return { rows: [], notice: "Mənbə hesabatı üçün müştəri və satışlara baxış icazəsi lazımdır." }; }
  const customers = await db.crmEntry.findMany({ where: { AND: [cw, ...(from || to ? [{ createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }] : []), ...(q.get("assigneeId") ? [{ assigneeId: q.get("assigneeId")! }] : [])] } });
  const ids = customers.map(x => x.id);
  const sales = await db.crmEntry.findMany({ where: { AND: [sw, { customerId: { in: ids } }] } });
  let payments: typeof sales = [], canPayments = false;
  try {
    const pw = await where(db, c, "payments"); canPayments = true;
    payments = await db.crmEntry.findMany({ where: { AND: [pw, { status: "RECORDED", OR: [{ customerId: { in: ids } }, { saleId: { in: sales.map(s => s.id) } }] }] } });
  } catch (e) { if (!(e instanceof CRMError) || e.status !== 403) throw e; /* Omit inaccessible revenue, not as zero. */ }
  const groups = new Map<string, { source: string; leads: number; deals: number; won: number; lost: number; convertedCustomers: number; conversion: number; agreed: Record<string, number>; received: Record<string, number> | null }>();
  for (const customer of customers) {
    const source = String((customer.data as any).source || "Naməlum");
    let row = groups.get(source);
    if (!row) { row = { source, leads: 0, deals: 0, won: 0, lost: 0, convertedCustomers: 0, conversion: 0, agreed: {}, received: canPayments ? {} : null }; groups.set(source, row); }
    row.leads++;
    const related = sales.filter(s => s.customerId === customer.id), relatedIds = related.map(s => s.id);
    row.deals += related.length; row.won += related.filter(s => s.status === "WON").length; row.lost += related.filter(s => s.status === "LOST").length;
    if (related.some(s => s.status === "WON")) row.convertedCustomers++;
    for (const s of related.filter(s => s.status === "WON")) row.agreed[s.currency] = Math.round(((row.agreed[s.currency] || 0) + Number(s.amount)) * 100) / 100;
    for (const p of payments.filter(p => (p.saleId ? relatedIds.includes(p.saleId) : p.customerId === customer.id))) row.received![p.currency] = Math.round(((row.received![p.currency] || 0) + Number(p.amount)) * 100) / 100;
  }
  for (const row of groups.values()) row.conversion = Math.round(row.convertedCustomers / row.leads * 10000) / 100;
  return { rows: [...groups.values()], notice: "Tarix filtri müştərinin yaranma tarixinə aiddir. Çevrilmə = ən azı bir qazanılmış satışı olan müştərilər / müraciətlər. Məbləğlər həmin müştərilərin görünən satış və ödənişləridir; valyutalar ayrıdır." };
}
