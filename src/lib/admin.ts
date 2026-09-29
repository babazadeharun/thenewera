import { getCurrentUser } from './auth';

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHORIZED');
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  return user;
}
