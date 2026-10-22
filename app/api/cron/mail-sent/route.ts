import { timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { retrySentCopies } from '@/lib/mail/sent';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(r: Request) {
  const secret = process.env.CRON_SECRET;
  const given = Buffer.from(r.headers.get('authorization') || '');
  const expected = Buffer.from('Bearer ' + (secret || ''));
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) return Response.json({ error: 'İcazə yoxdur.' }, { status: 403 });
  try {
    await prisma.authRateLimit.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 86400000) } } });
    return Response.json(await retrySentCopies(Date.now() + 25000), { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Mail arxivi yoxlanılmadı.' }, { status: 503 }); }
}
