import { prisma } from '@/lib/prisma';
import { reject, linkFor, tokenFor, sha } from './offer-policy';
import { usernameInput, draftInput, versionInput, statusInput, profileFor } from './prospecting-policy';
import { statusLabel } from './prospecting-shared';
import type { Prisma } from '@prisma/client';
const selection = { id: true, title: true, contactName: true, source: true, notes: true, instagramProspect: true, client: { select: { company: true, firstName: true, lastName: true } } } satisfies Prisma.SalesDealSelect;
export async function prospectList(params: URLSearchParams) {
  const page = Number(params.get('page') || 1), query = (params.get('q') || '').trim(), status = params.get('status') || 'ALL';
  if (!Number.isInteger(page) || page < 1 || page > 10000 || query.length > 200) reject('Axtarış parametrləri düzgün deyil.');
  if (status !== 'ALL') statusInput(status);
  const where: Prisma.SalesDealWhereInput = {
    ...(query ? { OR: [ { title: { contains: query, mode: 'insensitive' } }, { contactName: { contains: query, mode: 'insensitive' } }, { client: { company: { contains: query, mode: 'insensitive' } } }, { instagramProspect: { username: { contains: query.replace(/^@/, ''), mode: 'insensitive' } } } ] } : {}),
    ...(status === 'ALL' ? {} : status === 'NEW' ? { AND: [{ OR: [{ instagramProspect: null }, { instagramProspect: { status } }] }] } : { instagramProspect: { status } }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.salesDeal.findMany({ where, select: selection, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * 25, take: 25 }),
    prisma.salesDeal.count({ where }),
  ]);
  return { items: items.map(d => ({ ...d, notes: undefined, profile: profileFor(d.instagramProspect?.username || '') })), total, page };
}
export async function prospectDetail(id: string) {
  if (!id || id.length > 100) reject('Satış ID düzgün deyil.');
  const deal = await prisma.salesDeal.findUnique({ where: { id }, select: selection });
  if (!deal) reject('Satış tapılmadı.', 404);
  const [offers, history] = await Promise.all([
    prisma.salesOffer.findMany({ where: { dealId: id, state: { in: ['OPEN','CHANGES_REQUESTED','MEETING_REQUESTED'] }, expiresAt: { gt: new Date() } }, select: { id: true, title: true, version: true, state: true, firstViewedAt: true, responseAt: true }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.salesActivity.findMany({ where: { dealId: id, type: 'NOTE', text: { startsWith: '[Instagram əlaqəsi]' } }, select: { id: true, text: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ]);
  const match = deal.notes?.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?/i);
  let suggestedUsername = '';
  if (match) { try { suggestedUsername = usernameInput(match[0]); } catch {} }
  return { deal: { ...deal, notes: undefined }, offers, history, suggestedUsername };
}
export async function prospectChange(actorId: string, b: any) {
  if (typeof b.dealId !== 'string' || !b.dealId || b.dealId.length > 100) reject('Satış seçin.');
  const version = versionInput(b.version);
  if (!['save','status'].includes(b.action)) reject('Əməliyyat düzgün deyil.');
  const input = b.action === 'save' ? { username: usernameInput(b.username), draft: draftInput(b.draft) } : { status: statusInput(b.status) };
  return prisma.$transaction(async db => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(73021110)`;
    const deal = await db.salesDeal.findUnique({ where: { id: b.dealId }, include: { instagramProspect: true } });
    if (!deal) reject('Satış tapılmadı.', 404);
    const before = deal.instagramProspect;
    if ((before?.version || 0) !== version) reject('Bu qeyd başqa pəncərədə dəyişib. Bağlayıb yenidən açın.', 409);
    if (b.action === 'status' && ['FIRST_SENT','OFFER_SHARED'].includes(b.status)) {
      if (b.confirm !== true) reject('Instagram-da mesajı özünüz göndərdiyinizi təsdiqləyin.');
      if (!before?.username) reject('Əvvəl Instagram profilini yadda saxlayın.');
      if (before.status === 'DO_NOT_CONTACT') reject('Bu müştəri ilə əlaqə saxlanmamalıdır. Əvvəl statusu ayrıca dəyişin.', 409);
    }
    if (before && Object.entries(input).every(([k,v]) => (before as any)[k] === v)) return { ok: true, prospect: before };
    const contact = b.action === 'status' && ['FIRST_SENT','OFFER_SHARED'].includes(b.status);
    const record = await db.salesInstagramProspect.upsert({
      where: { dealId: deal.id },
      create: { dealId: deal.id, username: '', draft: '', ...input, updatedById: actorId, ...(contact ? { lastContactAt: new Date() } : {}) },
      update: { ...input, version: { increment: 1 }, updatedById: actorId, ...(contact ? { lastContactAt: new Date() } : {}) },
    });
    const text = b.action === 'save'
      ? `[Instagram əlaqəsi] Profil / mesaj qaralaması yeniləndi${record.username ? ': @' + record.username : ''}. Sistem mesaj göndərməyib.`
      : `[Instagram əlaqəsi] ${statusLabel(before?.status || 'NEW')} → ${statusLabel(record.status)}.${contact ? ' Operator Instagram-da əl ilə göndərdiyini təsdiqlədi; çatdırılma və oxunma təsdiqi deyil.' : ' Operatorun əl ilə qeyd etdiyi statusdur.'}`;
    await db.salesActivity.create({ data: { dealId: deal.id, createdByUserId: actorId, type: 'NOTE', text } });
    return { ok: true, prospect: record };
  }, { timeout: 15000 });
}
export async function prospectOfferLink(b: any) {
  if (typeof b.offerId !== 'string' || typeof b.dealId !== 'string' || b.offerId.length > 100 || b.dealId.length > 100) reject('Təklif seçin.');
  const [offer, prospect] = await Promise.all([
    prisma.salesOffer.findUnique({ where: { id: b.offerId } }),
    prisma.salesInstagramProspect.findUnique({ where: { dealId: b.dealId } }),
  ]);
  if (prospect?.status === 'DO_NOT_CONTACT') reject('Bu müştəri ilə əlaqə saxlanmamalıdır.', 409);
  if (!offer || offer.dealId !== b.dealId || !['OPEN','CHANGES_REQUESTED','MEETING_REQUESTED'].includes(offer.state) || offer.expiresAt <= new Date()) reject('Bu satışa aid aktiv yayımlanmış təklif seçin.', 409);
  if (offer.tokenHash !== sha(tokenFor(offer.id))) reject('Təklif linki dəyişib. Təklifi yoxlayın.', 409);
  return { link: linkFor(offer.id) };
}
