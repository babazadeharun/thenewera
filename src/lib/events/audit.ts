import { prisma } from '@/lib/prisma';
import type { AuditAction } from '@prisma/client';

export async function writeEventAudit(input: {
  action: AuditAction; entityType: string; entityId?: string | null; actorUserId?: string | null;
  promoterId?: string | null; eventId?: string | null; request?: Request; metadata?: Record<string, unknown>;
}) {
  const headers = input.request?.headers;
  const forwarded = headers?.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ipAddress = forwarded || headers?.get('x-real-ip') || null;
  const userAgent = headers?.get('user-agent') || null;
  return prisma.eventAuditLog.create({ data: {
    action: input.action, entityType: input.entityType, entityId: input.entityId ?? null,
    actorUserId: input.actorUserId ?? null, promoterId: input.promoterId ?? null, eventId: input.eventId ?? null,
    ipAddress, userAgent, metadata: input.metadata ? JSON.stringify(input.metadata).slice(0, 10000) : null,
  }});
}
