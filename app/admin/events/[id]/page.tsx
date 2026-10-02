import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireEventsAdmin } from '@/lib/events/authorization';
import EventOperationsClient from './EventOperationsClient';

export default async function EventOperationsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEventsAdmin();
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } });
  if (!event) notFound();
  return <EventOperationsClient eventId={id} />;
}
