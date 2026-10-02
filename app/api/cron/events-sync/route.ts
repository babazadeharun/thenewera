import { NextResponse } from 'next/server';
import { syncExternalEvents } from '@/lib/events/external-sync';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const result = await syncExternalEvents();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'EVENT_SYNC_FAILED';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
