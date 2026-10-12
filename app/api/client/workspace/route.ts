import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getWorkspaceContext } from '@/lib/workspace';
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const context = await getWorkspaceContext(user.id);
  if (!context?.workspace || !context.membership) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  if (!context.membership.active || context.workspace.status !== 'ACTIVE') return NextResponse.json({ error: 'Workspace unavailable' }, { status: 403 });
  return NextResponse.json({ workspace: context.workspace, membership: context.membership, permissions: context.permissions });
}
