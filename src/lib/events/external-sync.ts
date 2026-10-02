import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const SOURCE = 'iticket';
const API_URL = process.env.EVENTS_SOURCE_API_URL || 'https://api.softon.dev/v1/events';
const API_KEY = process.env.EVENTS_SOURCE_API_KEY || process.env.SOFTON_KEY;
const SOURCE_NAME = process.env.EVENTS_SOURCE_NAME || 'iTicket.AZ';

export type ExternalEvent = {
  id: string;
  source?: string;
  name: string;
  category?: string | null;
  venue?: { id?: string; name?: string | null; address?: string | null } | null;
  starts_at?: string | null;
  ends_at?: string | null;
  price?: { min?: number | null; max?: number | null; currency?: string | null } | null;
  age_limit?: string | null;
  tickets_available?: number | null;
  description?: string | null;
  url?: string | null;
  poster_url?: string | null;
  ingested_at?: string | null;
};

type ListResponse = { data?: ExternalEvent[]; meta?: { next?: string | null }; error?: unknown };

function requireKey() {
  if (!API_KEY) throw new Error('EVENTS_SOURCE_API_KEY_MISSING');
}

async function fetchPage(cursor?: string) {
  requireKey();
  const url = new URL(API_URL);
  url.searchParams.set('source', SOURCE);
  url.searchParams.set('limit', '100');
  url.searchParams.set('order', 'starts_at');
  if (cursor) url.searchParams.set('cursor', cursor);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as ListResponse;
  if (!response.ok) throw new Error(`EVENTS_SOURCE_HTTP_${response.status}`);
  if (payload.error) throw new Error('EVENTS_SOURCE_API_ERROR');
  return payload;
}

function cleanSlug(value: string) {
  return value.trim().toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function stableSlug(event: ExternalEvent) {
  const base = cleanSlug(event.name) || 'event';
  const id = event.id.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().slice(-24);
  return `${base}-iticket-${id}`.slice(0, 120);
}

function parseStart(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function publicPrice(event: ExternalEvent) {
  const value = event.price?.min;
  if (value == null || !Number.isFinite(Number(value))) return new Prisma.Decimal(0);
  return new Prisma.Decimal(Number(value)).toDecimalPlaces(2);
}

async function upsertPoster(event: ExternalEvent) {
  if (!event.poster_url) return null;
  const storageKey = `external:${SOURCE}:${event.id}:poster`;
  const existing = await prisma.media.findFirst({ where: { storageKey } });
  const data = {
    filename: `${SOURCE}-${event.id.replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`,
    originalName: event.name.slice(0, 180),
    mimeType: 'image/jpeg',
    size: 0,
    url: event.poster_url,
    storageKey,
    category: 'GENERAL' as const,
    alt: event.name,
  };
  if (existing) {
    if (existing.url !== event.poster_url || existing.alt !== event.name) {
      return prisma.media.update({ where: { id: existing.id }, data });
    }
    return existing;
  }
  return prisma.media.create({ data });
}

export async function syncExternalEvents() {
  requireKey();
  let cursor: string | undefined;
  let pages = 0;
  let received = 0;
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const now = new Date();

  do {
    const page = await fetchPage(cursor);
    pages += 1;
    const rows = Array.isArray(page.data) ? page.data : [];
    received += rows.length;

    for (const item of rows) {
      const startsAt = parseStart(item.starts_at);
      if (!startsAt || !item.id || !item.name?.trim()) {
        skipped += 1;
        continue;
      }

      const existing = await prisma.event.findFirst({
        where: { externalSource: SOURCE, externalId: item.id },
        select: { id: true, slug: true, coverMediaId: true, isPublic: true, status: true },
      });
      const poster = await upsertPoster(item);
      const venueName = item.venue?.name?.trim() || null;
      const address = item.venue?.address?.trim() || null;
      const description = [item.description?.trim(), item.age_limit ? `Yaş həddi: ${item.age_limit}` : null].filter(Boolean).join('\n\n') || null;
      const price = publicPrice(item);
      const sourceIngestedAt = item.ingested_at ? new Date(item.ingested_at) : null;
      const safeIngestedAt = sourceIngestedAt && !Number.isNaN(sourceIngestedAt.getTime()) ? sourceIngestedAt : null;

      const data = {
        name: item.name.trim(),
        venue: venueName || address,
        startsAt,
        description,
        publicTicketPrice: price,
        externalUrl: item.url || null,
        externalPosterUrl: item.poster_url || null,
        externalCategory: item.category || null,
        externalIngestedAt: safeIngestedAt,
        lastExternalSyncAt: now,
        coverMediaId: poster?.id ?? existing?.coverMediaId ?? null,
      };

      if (existing) {
        await prisma.event.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.event.create({
          data: {
            ...data,
            slug: stableSlug(item),
            promoterDiscountPercent: new Prisma.Decimal(0),
            totalInventory: 0,
            status: 'DRAFT',
            isPublic: false,
            externalSource: SOURCE,
            externalId: item.id,
          },
        });
        imported += 1;
      }
    }

    cursor = page.meta?.next || undefined;
    if (pages >= 30) break;
  } while (cursor);

  return { source: SOURCE_NAME, pages, received, imported, updated, skipped, syncedAt: now.toISOString() };
}
