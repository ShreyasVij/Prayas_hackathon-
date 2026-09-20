export type Role = 'patient' | 'guardian' | 'doctor' | 'admin' | 'system-worker' | 'public' | (string & {});

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  doctor: ['document:read', 'document:upload', 'document:summary', 'profile:read'],
  patient: ['document:read', 'document:upload', 'document:delete', 'profile:read', 'profile:edit'],
  guardian: ['document:read', 'document:upload', 'document:delete', 'profile:read'],
  'system-worker': ['*'],
  public: [],
};

export function hasPermission(role: Role | string, permission: string): boolean {
  if (!role) return false;
  if (role === 'admin' || role === 'system-worker') return true;
  const perms = ROLE_PERMISSIONS[role as string] || [];
  return perms.includes('*') || perms.includes(permission);
}
