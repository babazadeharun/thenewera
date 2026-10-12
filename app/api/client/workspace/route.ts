import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getWorkspaceContext, hasPermission, PERMISSIONS } from '@/lib/workspace';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const context = await getWorkspaceContext(user.id);

  if (!context?.workspace || !context.membership) {
    return NextResponse.json(
      { error: 'Workspace not found' },
      { status: 404 }
    );
  }

  const { workspace, membership } = context;

  if (
    !membership.active ||
    workspace.status !== 'ACTIVE' ||
    !hasPermission(context, PERMISSIONS.VIEW_DASHBOARD) ||
    !user.clientId ||
    workspace.clientId !== user.clientId
  ) {
    return NextResponse.json(
      { error: 'Workspace unavailable' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    workspace: {
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      status: workspace.status,
      createdAt: workspace.createdAt,
    },
    membership: {
      role: membership.role,
      active: membership.active,
    },
    permissions: context.permissions,
  });
}
