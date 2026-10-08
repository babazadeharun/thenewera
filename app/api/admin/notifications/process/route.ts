import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { processScheduledNotifications } from '@/lib/notifications/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.get('authorization');
  const cronAuthorized = Boolean(secret && authorization === `Bearer ${secret}`);
  if (!cronAuthorized) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try { return NextResponse.json({ ok:true, ...(await processScheduledNotifications()) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'NOTIFICATION_PROCESS_FAILED' }, { status: 500 }); }
}

export async function POST(req: NextRequest) { return GET(req); }
