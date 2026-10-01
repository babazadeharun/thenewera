import { getCurrentUser } from '../auth';
import { prisma } from '../prisma';

const EVENTS_ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'EVENTS_ADMIN']);
const EVENTS_FINANCE_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'EVENTS_FINANCE']);

export async function requireEventsAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  if (!EVENTS_ADMIN_ROLES.has(user.role)) throw new Error('FORBIDDEN');
  return user;
}

export async function requireEventsFinance() {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  if (!EVENTS_FINANCE_ROLES.has(user.role)) throw new Error('FORBIDDEN');
  return user;
}

export async function requirePromoter() {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  if (user.role !== 'PROMOTER') throw new Error('FORBIDDEN');

  const promoter = await prisma.promoter.findUnique({
    where: { userId: user.id },
  });

  if (!promoter) throw new Error('PROMOTER_PROFILE_NOT_FOUND');
  if (promoter.status !== 'ACTIVE') throw new Error('PROMOTER_NOT_ACTIVE');

  return { user, promoter };
}

export async function requirePromoterOwnership(promoterId: string) {
  const { promoter } = await requirePromoter();
  if (promoter.id !== promoterId) throw new Error('FORBIDDEN');
  return promoter;
}
