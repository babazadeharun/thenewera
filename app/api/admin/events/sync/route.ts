import { NextResponse } from 'next/server';
import { requireEventsAdmin } from '@/lib/events/authorization';
import { syncExternalEvents } from '@/lib/events/external-sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await requireEventsAdmin();
    const result = await syncExternalEvents();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'EVENT_SYNC_FAILED';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
