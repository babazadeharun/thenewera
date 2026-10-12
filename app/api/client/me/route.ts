import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getWorkspaceContext } from '@/lib/workspace';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const context = await getWorkspaceContext(user.id);
  if (!context) return NextResponse.json({ error: 'Account context not found' }, { status: 404 });
  if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'ARCHIVED') return NextResponse.json({ error: 'Account unavailable' }, { status: 403 });
  return NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role, accountStatus: user.accountStatus, accountType: user.accountType, verifiedAt: user.verifiedAt, lastLoginAt: user.lastLoginAt },
    client: context.user.client,
    workspace: context.workspace,
    membership: context.membership ? { id: context.membership.id, role: context.membership.role, active: context.membership.active } : null,
    permissions: context.permissions,
  });
}
