import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

async function adminUser() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return { user: null, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user, response: null };
}

export async function GET(req: NextRequest) {
  const { user, response } = await adminUser(); if (response || !user) return response!;
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get('page') || 1));
  const limit = Math.min(50, Math.max(1, Number(sp.get('limit') || 20)));
  const filter = sp.get('filter') || (sp.get('unreadOnly') === 'true' ? 'unread' : 'all');
  const where = { OR: [{ userId: user.id }, { userId: null }], ...(filter === 'unread' ? { isRead: false } : filter === 'read' ? { isRead: true } : {}) } as any;
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { isRead: false, OR: [{ userId: user.id }, { userId: null }] } }),
  ]);
  return NextResponse.json({ notifications, total, unreadCount, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
}
