import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
import EventsAdminClient from './EventsAdminClient';
export default async function AdminEventsPage(){
  const user=await getCurrentUser();
  if(!user) redirect('/login');
  if(!['ADMIN','SUPER_ADMIN','EVENTS_ADMIN'].includes(user.role)) redirect(getAccountHomePath(user.role));
  return <EventsAdminClient role={user.role}/>;
}
