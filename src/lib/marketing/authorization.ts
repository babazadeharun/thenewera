import { getCurrentUser } from '@/lib/auth';

export async function requireMarketingAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) throw new Error('FORBIDDEN');
  return user;
}
