import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getAccountHomePath } from '@/lib/account-routing';
import EventOperationsClient from './EventOperationsClient';

export default async function EventOperationsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!['ADMIN','SUPER_ADMIN','EVENTS_ADMIN'].includes(user.role)) redirect(getAccountHomePath(user.role));
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) notFound();
  return <EventOperationsClient eventId={id} />;
}
