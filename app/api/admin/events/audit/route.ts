import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';

export async function GET(req: Request) {
  try {
    await requireEventsAdmin();

    const u = new URL(req.url);
    const eventId = u.searchParams.get('eventId');
    const promoterId = u.searchParams.get('promoterId');

    const logs = await prisma.eventAuditLog.findMany({
      where: {
        ...(eventId ? { eventId } : {}),
        ...(promoterId ? { promoterId } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        promoter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({ logs });
  } catch (e) {
    const m = e instanceof Error ? e.message : 'REQUEST_FAILED';

    return NextResponse.json(
      { error: m },
      { status: m === 'UNAUTHORIZED' ? 401 : 403 }
    );
  }
}