import { prisma } from '@/lib/prisma';

export type NotificationType =
  | 'INVOICE_OVERDUE'
  | 'FOLLOW_UP_DUE'
  | 'NEW_EMAIL'
  | 'PAYMENT_RECEIVED'
  | 'PROMOTER_APPLICATION'
  | 'PROJECT_DEADLINE'
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

type NotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  link?: string | null;
};

function utcDayRange(date: Date) {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function createOncePerDay(input: NotificationInput, date: Date) {
  const { start, end } = utcDayRange(date);

  const existing = await prisma.customerNotification.findFirst({
    where: {
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 180),
      message: input.message.slice(0, 2000),
      createdAt: { gte: start, lt: end },
    },
    select: { id: true },
  });

  if (existing) return false;

  await prisma.customerNotification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 180),
      message: input.message.slice(0, 2000),
      link: input.link?.slice(0, 500) || null,
    },
  });

  return true;
}

export async function createNotification(input: NotificationInput) {
  return prisma.customerNotification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 180),
      message: input.message.slice(0, 2000),
      link: input.link?.slice(0, 500) || null,
    },
  });
}

export async function processScheduledNotifications() {
  const now = new Date();
  const { start: todayStart } = utcDayRange(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true },
  });

  if (admins.length === 0) {
    return {
      created: 0,
      checkedAt: now.toISOString(),
      message: 'No admin recipients found',
    };
  }

  let created = 0;

  async function notifyAdmins(input: Omit<NotificationInput, 'userId'>) {
    for (const admin of admins) {
      const wasCreated = await createOncePerDay(
        { ...input, userId: admin.id },
        now,
      );
      if (wasCreated) created++;
    }
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ['SENT', 'PARTIALLY_PAID'] },
      dueDate: { lt: now },
    },
    select: {
      id: true,
      number: true,
      dueDate: true,
      client: {
        select: { company: true, firstName: true, lastName: true },
      },
    },
    take: 200,
  });

  for (const invoice of invoices) {
    const name =
      invoice.client.company ||
      `${invoice.client.firstName} ${invoice.client.lastName}`.trim() ||
      'Müştəri';

    await notifyAdmins({
      type: 'INVOICE_OVERDUE',
      title: 'Invoice overdue',
      message: `${name} — ${invoice.number} fakturasının ödənişi gecikib.`,
      link: '/admin?tab=finance',
    });
  }

  const followUps = await prisma.salesActivity.findMany({
    where: {
      type: 'FOLLOW_UP',
      completedAt: null,
      dueAt: { lte: now },
    },
    select: {
      id: true,
      text: true,
      deal: { select: { title: true } },
    },
    take: 200,
  });

  for (const activity of followUps) {
    await notifyAdmins({
      type: 'FOLLOW_UP_DUE',
      title: 'Follow-up vaxtı çatıb',
      message: `${activity.deal.title}: ${activity.text}`,
      link: '/admin?tab=sales',
    });
  }

  const upcoming = await prisma.project.findMany({
    where: { deadline: { gt: now, lte: tomorrow } },
    select: { id: true, title: true, deadline: true },
    take: 200,
  });

  for (const project of upcoming) {
    await notifyAdmins({
      type: 'PROJECT_DEADLINE',
      title: 'Layihənin deadline-ı yaxınlaşır',
      message: `“${project.title}” layihəsinin deadline-ına 24 saatdan az qalıb.`,
      link: '/admin?tab=projects',
    });
  }

  const overdueProjects = await prisma.project.findMany({
    where: {
      deadline: { lt: todayStart },
      status: { not: 'COMPLETED' },
    },
    select: { id: true, title: true, deadline: true },
    take: 200,
  });

  for (const project of overdueProjects) {
    await notifyAdmins({
      type: 'PROJECT_DEADLINE',
      title: 'Layihənin deadline-ı keçib',
      message: `“${project.title}” layihəsinin deadline-ı keçib.`,
      link: '/admin?tab=projects',
    });
  }

  return { created, checkedAt: now.toISOString() };
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.customerNotification.count({
    where: { userId, isRead: false },
  });
}
