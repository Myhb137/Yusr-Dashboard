import { authService } from '../services/authService';
import type { UserRole } from '../types/api';

export type NormalizedRole = 'user' | 'admin' | 'superadmin';

export function normalizeRole(role: unknown): NormalizedRole {
  const r = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[_ ]/g, '');
  if (r === 'superadmin') return 'superadmin';
  if (r === 'admin' || r === 'agencyadmin') return 'admin';
  return 'user';
}

export function getCurrentRole(): NormalizedRole {
  const user = authService.getStoredUser();
  const role =
    user?.role ||
    user?.user?.role ||
    user?.data?.role ||
    user?.user_metadata?.role ||
    user?.app_metadata?.role;
  return normalizeRole(role);
}

export function roleFromUserRole(role: UserRole | string | undefined): NormalizedRole {
  return normalizeRole(role);
}

export function isSuperAdmin(role?: NormalizedRole): boolean {
  return (role ?? getCurrentRole()) === 'superadmin';
}

export function isAdmin(role?: NormalizedRole): boolean {
  const r = role ?? getCurrentRole();
  return r === 'admin' || r === 'superadmin';
}

/** Agency admin and super admin may create/edit offers (POST /api/v1/offers). */
export function canManageOffers(role?: NormalizedRole): boolean {
  return isAdmin(role);
}

export function canChangeBookingStatus(role?: NormalizedRole): boolean {
  return isAdmin(role);
}
