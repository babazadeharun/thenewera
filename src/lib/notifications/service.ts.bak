import { prisma } from '@/lib/prisma';
import type { NotificationPriority, NotificationType, Prisma } from '@prisma/client';
import { Prisma as PrismaNamespace } from '@prisma/client';

export type CreateNotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  eventKey: string;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  priority?: NotificationPriority;
  metadata?: Prisma.InputJsonValue | null;
  userId?: string | null;
};

export async function createNotification(input: CreateNotificationInput) {
  try {
    return await prisma.notification.create({
      data: {
        type: input.type,
        title: input.title.slice(0, 180),
        message: input.message.slice(0, 2000),
        eventKey: input.eventKey,
        link: input.link?.slice(0, 500) || null,
        entityType: input.entityType?.slice(0, 80) || null,
        entityId: input.entityId?.slice(0, 120) || null,
        priority: input.priority ?? 'NORMAL',
        metadata: input.metadata ?? undefined,
        userId: input.userId ?? null,
      },
    });
  } catch (error) {
    if (error instanceof PrismaNamespace.PrismaClientKnownRequestError && error.code === 'P2002') {
      return prisma.notification.findUniqueOrThrow({ where: { eventKey: input.eventKey } });
    }
    throw error;
  }
}

export async function processScheduledNotifications() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  let created = 0;

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'PARTIALLY_PAID'] },
      dueDate: { lt: now },
    },
    select: { id: true, number: true, dueDate: true, total: true, paidAmount: true, currency: true, client: { select: { company: true, firstName: true, lastName: true } } },
    take: 200,
  });
  for (const invoice of invoices) {
    const name = invoice.client.company || `${invoice.client.firstName} ${invoice.client.lastName}`.trim() || 'Müştəri';
    const result = await createNotification({
      type: 'INVOICE_OVERDUE',
      title: 'Invoice overdue',
      message: `${name} şirkətinin ${invoice.number} invoice ödənişi gecikib.`,
      eventKey: `INVOICE_OVERDUE:${invoice.id}:${today}`,
      link: '/admin?tab=finance', entityType: 'Invoice', entityId: invoice.id, priority: 'HIGH',
      metadata: { amount: Number(invoice.total), paid: Number(invoice.paidAmount), currency: invoice.currency, dueDate: invoice.dueDate.toISOString() },
    });
    if (result.createdAt.getTime() >= now.getTime() - 1000) created++;
  }

  const followUps = await prisma.salesActivity.findMany({
    where: { type: 'FOLLOW_UP', completedAt: null, dueAt: { lte: now } },
    select: { id: true, text: true, dueAt: true, deal: { select: { id: true, title: true } } },
    take: 200,
  });
  for (const activity of followUps) {
    const result = await createNotification({
      type: 'FOLLOW_UP_DUE', title: 'Follow-up bu gün',
      message: `${activity.deal.title}: ${activity.text}`,
      eventKey: `FOLLOW_UP_DUE:${activity.id}:${today}`,
      link: '/admin?tab=sales', entityType: 'SalesActivity', entityId: activity.id, priority: 'HIGH',
      metadata: { dueAt: activity.dueAt?.toISOString() ?? null, dealId: activity.deal.id },
    });
    if (result.createdAt.getTime() >= now.getTime() - 1000) created++;
  }

  const upcoming = await prisma.project.findMany({
    where: { deadline: { gt: now, lte: tomorrow } },
    select: { id: true, title: true, deadline: true }, take: 200,
  });
  for (const project of upcoming) {
    const result = await createNotification({
      type: 'PROJECT_DEADLINE', title: 'Project deadline sabahdır',
      message: `“${project.title}” layihəsinin deadline-ı 24 saatdan az qalıb.`,
      eventKey: `PROJECT_DEADLINE:${project.id}:24H`,
      link: '/admin?tab=projects', entityType: 'Project', entityId: project.id, priority: 'HIGH',
      metadata: { deadline: project.deadline?.toISOString() ?? null },
    });
    if (result.createdAt.getTime() >= now.getTime() - 1000) created++;
  }

  const overdueProjects = await prisma.project.findMany({
    where: { deadline: { lt: now }, status: { not: 'COMPLETED' } },
    select: { id: true, title: true, deadline: true }, take: 200,
  });
  for (const project of overdueProjects) {
    const result = await createNotification({
      type: 'PROJECT_DEADLINE', title: 'Project deadline keçib',
      message: `“${project.title}” layihəsinin deadline-ı keçib.`,
      eventKey: `PROJECT_DEADLINE:${project.id}:OVERDUE:${today}`,
      link: '/admin?tab=projects', entityType: 'Project', entityId: project.id, priority: 'URGENT',
      metadata: { deadline: project.deadline?.toISOString() ?? null, overdue: true },
    });
    if (result.createdAt.getTime() >= now.getTime() - 1000) created++;
  }

  return { created, checkedAt: now.toISOString() };
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { isRead: false, OR: [{ userId }, { userId: null }] } });
}
