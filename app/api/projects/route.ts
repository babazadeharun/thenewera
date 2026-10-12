import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { projectRepository } from '@/lib/data/repository';
import type { ProjectStatus } from '@/lib/data/types';
import { getWorkspaceContext, hasPermission, PERMISSIONS } from '@/lib/workspace';
import { prisma } from '@/lib/prisma';

const statuses: ProjectStatus[] = [
  'Brief Submitted',
  'Reviewing',
  'Approved',
  'In Progress',
  'Review',
  'Completed',
];

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (user.role === 'ADMIN') {
    const projects = await projectRepository.list();
    return NextResponse.json({ projects });
  }

  const context = await getWorkspaceContext(user.id);

  if (
    !context ||
    !context.membership?.active ||
    context.workspace?.status !== 'ACTIVE' ||
    !context.user.clientId ||
    context.workspace.clientId !== context.user.clientId ||
    !hasPermission(context, PERMISSIONS.VIEW_PROJECTS)
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const projects = await projectRepository.listByClientId(context.user.clientId);
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const context = user.role === 'ADMIN' ? null : await getWorkspaceContext(user.id);

  if (
    user.role !== 'ADMIN' &&
    (
      !context ||
      !context.membership?.active ||
      context.workspace?.status !== 'ACTIVE' ||
      !context.user.clientId ||
      context.workspace.clientId !== context.user.clientId ||
      !hasPermission(context, PERMISSIONS.CREATE_PROJECT)
    )
  ) {
    return NextResponse.json({ error: 'Bu əməliyyat üçün icazəniz yoxdur.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const title = String(body?.title ?? '').trim();
    const service = String(body?.service ?? '').trim();
    const brief = String(body?.brief ?? '').trim();

    if (!title || !service || !brief) {
      return NextResponse.json(
        { error: 'Başlıq, xidmət və layihə brief-i tələb olunur.' },
        { status: 400 },
      );
    }

    let clientId: string | undefined;
    let clientEmail = '';

    if (user.role === 'ADMIN') {
      clientEmail = String(body.clientEmail ?? '').trim().toLowerCase();

      if (!clientEmail) {
        return NextResponse.json(
          { error: 'Admin layihə üçün müştəri e-poçtunu daxil etməlidir.' },
          { status: 400 },
        );
      }

      const client = await prisma.client.findFirst({
        where: {
          OR: [
            { email: { equals: clientEmail, mode: 'insensitive' } },
            { phone: clientEmail },
          ],
        },
        select: { id: true, email: true, phone: true },
      });

      if (!client) {
        return NextResponse.json({ error: 'Müştəri tapılmadı.' }, { status: 404 });
      }

      clientId = client.id;
      clientEmail = client.email ?? client.phone ?? clientEmail;
    } else {
      clientId = context!.user.clientId!;
      clientEmail = context!.user.client?.email ?? context!.user.client?.phone ?? '';

      if (!clientEmail) {
        return NextResponse.json(
          { error: 'Müştəri hesabında əlaqə məlumatı yoxdur.' },
          { status: 400 },
        );
      }
    }

    const status: ProjectStatus =
      user.role === 'ADMIN' && statuses.includes(body.status)
        ? body.status
        : 'Brief Submitted';

    const project = await projectRepository.create({
      clientId,
      clientEmail,
      clientName: user.role === 'ADMIN'
        ? String(body.clientName ?? '')
        : `${context!.user.client?.firstName ?? ''} ${context!.user.client?.lastName ?? ''}`.trim(),
      company: user.role === 'ADMIN'
        ? (body.company ? String(body.company) : undefined)
        : (context!.user.client?.company ?? undefined),
      service,
      title,
      brief,
      goal: body.goal ? String(body.goal) : undefined,
      audience: body.audience ? String(body.audience) : undefined,
      deliverables: body.deliverables ? String(body.deliverables) : undefined,
      references: body.references ? String(body.references) : undefined,
      deadline: body.deadline ? String(body.deadline) : undefined,
      budget: body.budget ? String(body.budget) : undefined,
      creator: body.creator ? String(body.creator) : undefined,
      status,
    });

    if (user.role !== 'ADMIN') {
      await prisma.auditLog.create({
        data: {
          event: 'PROJECT_CREATED',
          actorId: user.id,
          targetUserId: user.id,
          metadata: { projectId: project.id },
        },
      }).catch(() => undefined);
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('project create', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(
      { error: 'Layihə yaratmaq mümkün olmadı.' },
      { status: 500 },
    );
  }
}
