import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    redirect(getAccountHomePath(user.role));
  }

  return <AdminClient />;
}