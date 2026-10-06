import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { enrichWithClaude } from './claude';
import { getLeadResearchProvider } from './provider';
import type { LeadSearchInput, ResearchResult } from './types';

export async function runLeadSearch(searchId: string) {
  const search = await prisma.leadSearch.findUnique({ where: { id: searchId } });
  if (!search) throw new Error('SEARCH_NOT_FOUND');

  await prisma.leadSearch.update({ where: { id: searchId }, data: { status: 'RUNNING', progress: 8, startedAt: new Date(), error: null } });
  try {
    const input: LeadSearchInput = {
      targetType: search.targetType,
      location: search.location,
      description: search.description,
      requestedCount: search.requestedCount,
      requiredFields: parseList(search.requiredFields),
      filters: parseList(search.filters),
    };
    const provider = getLeadResearchProvider();
    const raw = await provider.searchBusinesses(input);
    await prisma.leadSearch.update({ where: { id: searchId }, data: { provider: provider.name, sourcesScanned: raw.length, businessesFound: raw.length, progress: 42 } });

    const uniqueRaw = dedupeResults(raw);
    await prisma.leadSearch.update({ where: { id: searchId }, data: { duplicatesRemoved: raw.length - uniqueRaw.length, potentialLeads: uniqueRaw.length, progress: 55 } });

    const enriched = await enrichWithClaude(uniqueRaw.slice(0, search.requestedCount), search.description);
    await prisma.leadSearch.update({ where: { id: searchId }, data: { progress: 72 } });

    let verified = 0;
    for (let i = 0; i < uniqueRaw.length && i < enriched.length; i += 1) {
      const rawItem = uniqueRaw[i];
      const item = enriched[i];
      const dedupeKey = makeDedupeKey(item.email, item.website, item.phone, item.name, item.city);
      const lead = await prisma.lead.upsert({
        where: { dedupeKey },
        create: {
          dedupeKey, name: item.name, contactName: item.contactName || null, category: item.category || null, website: item.website || null,
          email: item.email || null, phone: item.phone || null, instagram: item.instagram || null, facebook: item.facebook || null,
          linkedin: item.linkedin || null, address: item.address || null, city: item.city || null, country: item.country || null,
          source: rawItem.source || provider.name, sourceUrl: rawItem.sourceUrl || null, score: item.score ?? null,
          aiSummary: item.summary || null, aiSignals: JSON.stringify(item.signals || []), rawData: JSON.stringify(rawItem.raw ?? rawItem),
          lastVerifiedAt: new Date(), status: 'NEW',
        },
        update: {
          contactName: item.contactName || undefined, website: item.website || undefined, email: item.email || undefined, phone: item.phone || undefined,
          instagram: item.instagram || undefined, facebook: item.facebook || undefined, linkedin: item.linkedin || undefined, address: item.address || undefined,
          city: item.city || undefined, country: item.country || undefined, source: rawItem.source || provider.name, sourceUrl: rawItem.sourceUrl || undefined,
          score: item.score ?? undefined, aiSummary: item.summary || undefined, aiSignals: item.signals ? JSON.stringify(item.signals) : undefined,
          rawData: JSON.stringify(rawItem.raw ?? rawItem), lastVerifiedAt: new Date(),
        },
      });
      await prisma.leadSearch.update({ where: { id: searchId }, data: { progress: Math.min(95, 72 + Math.round(((i + 1) / Math.max(enriched.length, 1)) * 23)) } });
      await prisma.leadResearchItem.upsert({
        where: { searchId_fingerprint: { searchId, fingerprint: dedupeKey } },
        create: { searchId, leadId: lead.id, provider: rawItem.source || provider.name, externalId: rawItem.externalId || null, title: rawItem.name, sourceUrl: rawItem.sourceUrl || null, rawData: JSON.stringify(rawItem.raw ?? rawItem), fingerprint: dedupeKey },
        update: { leadId: lead.id, rawData: JSON.stringify(rawItem.raw ?? rawItem), sourceUrl: rawItem.sourceUrl || null },
      });
      if (item.email || item.phone || item.website) verified += 1;
    }

    await prisma.leadSearch.update({ where: { id: searchId }, data: { status: 'COMPLETED', progress: 100, verifiedLeads: verified, completedAt: new Date() } });
  } catch (error) {
    await prisma.leadSearch.update({ where: { id: searchId }, data: { status: 'FAILED', error: error instanceof Error ? error.message : 'Lead research failed.', completedAt: new Date() } }).catch(() => undefined);
    throw error;
  }
}

function parseList(value: string | null) { try { return value ? JSON.parse(value) as string[] : []; } catch { return []; } }
function clean(value?: string) { return value?.trim().toLowerCase() || ''; }
function makeDedupeKey(email?: string, website?: string, phone?: string, name?: string, city?: string) {
  const seed = [clean(email), clean(website).replace(/^https?:\/\//, '').replace(/\/$/, ''), clean(phone).replace(/\D/g, ''), clean(name), clean(city)].filter(Boolean).join('|');
  return createHash('sha256').update(seed || 'empty').digest('hex');
}
function dedupeResults(results: ResearchResult[]) {
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = makeDedupeKey(item.email, item.website, item.phone, item.name, item.city);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
