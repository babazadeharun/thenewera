import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
import EventsFinanceClient from './EventsFinanceClient';

export default async function EventsFinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!['ADMIN', 'SUPER_ADMIN', 'EVENTS_FINANCE'].includes(user.role)) redirect(getAccountHomePath(user.role));
  return <EventsFinanceClient />;
}
