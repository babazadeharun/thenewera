/** Single source of truth for role-based account entry points. Keep this file free of server-only imports. */
export type AccountRole = 'SUPER_ADMIN' | 'ADMIN' | 'EVENTS_ADMIN' | 'EVENTS_FINANCE' | 'CLIENT' | 'CREATOR' | 'PROMOTER' | string;

export function getAccountHomePath(role: AccountRole | null | undefined): string {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return '/admin';
    case 'EVENTS_ADMIN':
      return '/admin/events';
    case 'EVENTS_FINANCE':
      return '/admin/events/finance';
    case 'PROMOTER':
      return '/promoter';
    case 'CREATOR':
      return '/creator';
    case 'CLIENT':
      return '/account';
    default:
      return '/login';
  }
}

export function isRoleAllowed(role: AccountRole | null | undefined, allowed: readonly string[]): boolean {
  return Boolean(role && allowed.includes(role));
}
