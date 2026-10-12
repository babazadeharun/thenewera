import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (!['CLIENT','PROMOTER'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const notifications = await prisma.customerNotification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 30 });
  return NextResponse.json({ notifications, unreadCount: notifications.filter((n) => !n.isRead).length });
}
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.all) await prisma.customerNotification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
  else if (body.id) await prisma.customerNotification.updateMany({ where: { id: String(body.id), userId: user.id }, data: { isRead: true, readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
