import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { projectRepository } from '@/lib/data/repository';
import { getWorkspaceContext, hasPermission, PERMISSIONS } from '@/lib/workspace';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const project = await projectRepository.get(id);

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (user.role !== 'ADMIN') {
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

    const ownedProject = await (async () => {
      const { prisma } = await import('@/lib/prisma');
      return prisma.project.findFirst({
        where: { id, clientId: context.user.clientId! },
        select: { id: true },
      });
    })();

    if (!ownedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const current = await projectRepository.get(id);

  if (!current) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (user.role !== 'ADMIN') {
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

    const ownedProject = await (async () => {
      const { prisma } = await import('@/lib/prisma');
      return prisma.project.findFirst({
        where: { id, clientId: context.user.clientId! },
        select: { id: true },
      });
    })();

    if (!ownedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
  }

  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const input = body as Record<string, unknown>;

    if (user.role === 'ADMIN') {
      const project = await projectRepository.update(id, input);
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      return NextResponse.json({ project });
    }

    const allowedKeys = ['messages', 'revisionRequests', 'review'];
    if (Object.keys(input).some((key) => !allowedKeys.includes(key))) {
      return NextResponse.json(
        { error: 'Clients may only submit messages, revision requests, and reviews' },
        { status: 403 }
      );
    }

    const patch: Record<string, unknown> = {};

    if (input.messages !== undefined) {
      if (!Array.isArray(input.messages) || input.messages.length > 0 &&
        (!input.messages.every((message) =>
          message && typeof message === 'object' &&
          typeof (message as Record<string, unknown>).text === 'string'
        ))) {
        return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
      }

      if (input.messages.length > 0) {
        patch.messages = [{
          from: 'client',
          text: String((input.messages[input.messages.length - 1] as Record<string, unknown>).text).slice(0, 5000),
          at: new Date().toISOString(),
        }];
      }
    }

    if (input.revisionRequests !== undefined) {
      if (!Array.isArray(input.revisionRequests) || input.revisionRequests.length > 0 &&
        !input.revisionRequests.every((item) =>
          item && typeof item === 'object' &&
          typeof (item as Record<string, unknown>).text === 'string'
        )) {
        return NextResponse.json({ error: 'Invalid revision requests' }, { status: 400 });
      }

      if (input.revisionRequests.length > 0) {
        patch.revisionRequests = [{
          text: String((input.revisionRequests[input.revisionRequests.length - 1] as Record<string, unknown>).text).slice(0, 5000),
          at: new Date().toISOString(),
        }];
      }
    }

    if (input.review !== undefined) {
      const review = input.review;
      if (
        !review || typeof review !== 'object' ||
        !Number.isInteger((review as Record<string, unknown>).rating) ||
        Number((review as Record<string, unknown>).rating) < 1 ||
        Number((review as Record<string, unknown>).rating) > 5 ||
        typeof (review as Record<string, unknown>).text !== 'string'
      ) {
        return NextResponse.json({ error: 'Invalid review' }, { status: 400 });
      }

      patch.review = {
        rating: Number((review as Record<string, unknown>).rating),
        text: String((review as Record<string, unknown>).text).slice(0, 5000),
        at: new Date().toISOString(),
      };
    }

    const project = await projectRepository.update(id, patch as Parameters<typeof projectRepository.update>[1]);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('project update', error);
    return NextResponse.json({ error: 'Unable to update project' }, { status: 500 });
  }
}
