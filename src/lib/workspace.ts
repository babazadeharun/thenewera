import { prisma } from '@/lib/prisma';
import type { AccountStatus, WorkspaceRole } from '@prisma/client';

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  VIEW_PROFILE: 'VIEW_PROFILE',
  MANAGE_PROFILE: 'MANAGE_PROFILE',
  VIEW_COMPANY: 'VIEW_COMPANY',
  MANAGE_COMPANY: 'MANAGE_COMPANY',
  VIEW_PROJECTS: 'VIEW_PROJECTS',
  CREATE_PROJECT: 'CREATE_PROJECT',
  VIEW_MESSAGES: 'VIEW_MESSAGES',
  SEND_MESSAGE: 'SEND_MESSAGE',
  VIEW_FILES: 'VIEW_FILES',
  UPLOAD_FILES: 'UPLOAD_FILES',
  VIEW_FINANCE: 'VIEW_FINANCE',
  VIEW_INVOICES: 'VIEW_INVOICES',
  VIEW_REPORTS: 'VIEW_REPORTS',
  MANAGE_WORKSPACE: 'MANAGE_WORKSPACE',
  MANAGE_TEAM: 'MANAGE_TEAM',
  VIEW_NOTIFICATIONS: 'VIEW_NOTIFICATIONS',
} as const;
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

const registered: Permission[] = [
  PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_PROFILE, PERMISSIONS.MANAGE_PROFILE,
  PERMISSIONS.VIEW_COMPANY, PERMISSIONS.MANAGE_COMPANY, PERMISSIONS.CREATE_PROJECT,
  PERMISSIONS.VIEW_PROJECTS, PERMISSIONS.VIEW_NOTIFICATIONS,
];
const clientOwner: Permission[] = Object.values(PERMISSIONS);
const manager: Permission[] = clientOwner.filter((p) => p !== PERMISSIONS.MANAGE_WORKSPACE && p !== PERMISSIONS.MANAGE_TEAM);
const member: Permission[] = [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_PROFILE, PERMISSIONS.MANAGE_PROFILE, PERMISSIONS.VIEW_COMPANY, PERMISSIONS.VIEW_PROJECTS, PERMISSIONS.CREATE_PROJECT, PERMISSIONS.VIEW_MESSAGES, PERMISSIONS.SEND_MESSAGE, PERMISSIONS.VIEW_FILES, PERMISSIONS.VIEW_NOTIFICATIONS];
const viewer: Permission[] = [PERMISSIONS.VIEW_DASHBOARD, PERMISSIONS.VIEW_PROFILE, PERMISSIONS.VIEW_COMPANY, PERMISSIONS.VIEW_PROJECTS, PERMISSIONS.VIEW_FILES, PERMISSIONS.VIEW_NOTIFICATIONS];

export function permissionsFor(status: AccountStatus, role: WorkspaceRole): Permission[] {
  if (status === 'REGISTERED' || status === 'QUALIFIED') return role === 'OWNER' ? registered : viewer;
  if (status !== 'CLIENT') return [];
  return role === 'OWNER' ? clientOwner : role === 'MANAGER' ? manager : role === 'MEMBER' ? member : viewer;
}

export async function getWorkspaceContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, accountStatus: true, accountType: true, verifiedAt: true, clientId: true,
      client: { select: { id:true, firstName:true, lastName:true, email:true, phone:true, company:true, jobTitle:true, industry:true, companySize:true, country:true, website:true, instagram:true } },
      workspaceMemberships: { where: { active: true }, orderBy: { createdAt: 'asc' }, take: 1, include: { workspace: true } },
    },
  });
  if (!user) return null;
  const membership = user.workspaceMemberships[0] ?? null;
  const permissions = membership ? permissionsFor(user.accountStatus, membership.role) : [];
  return { user, membership, workspace: membership?.workspace ?? null, permissions };
}

export function hasPermission(context: Awaited<ReturnType<typeof getWorkspaceContext>>, permission: Permission) {
  return Boolean(context?.membership?.active && context.workspace?.status === 'ACTIVE' && context.permissions.includes(permission));
}

export async function createWorkspaceForUser(userId: string, clientId: string, name: string, type: 'INDIVIDUAL' | 'BUSINESS') {
  return prisma.workspace.create({
    data: {
      name,
      type,
      ownerUserId: userId,
      clientId,
      memberships: { create: { userId, role: 'OWNER' } },
    },
  });
}

export async function addCustomerNotification(userId: string, input: { type: string; title: string; message: string; link?: string }) {
  return prisma.customerNotification.create({ data: { userId, ...input } });
}
