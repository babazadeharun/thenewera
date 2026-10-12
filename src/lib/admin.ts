import { getCurrentUser } from './auth';

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) throw new Error('FORBIDDEN');
  return user;
}
