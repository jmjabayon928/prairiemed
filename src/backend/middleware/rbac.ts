// src/backend/middleware/rbac.ts
import { type RequestHandler } from 'express';

/** Normalize all role strings to lowercase (defensive) */
function normalizeRoles(roles: string[] | undefined): string[] {
  return Array.isArray(roles) ? roles.map((r) => r.toLowerCase()) : [];
}

/**
 * Shared helper: RBAC gate with SuperAdmin/OrgAdmin bypass.
 * Exported so controllers can do defense-in-depth checks.
 */
export function canAccess(userRoles: string[] | undefined, allowed?: string[]): boolean {
  if (!allowed || allowed.length === 0) return true;
  if (!userRoles || userRoles.length === 0) return false;

  const roles = normalizeRoles(userRoles);

  // Unified bypass: SuperAdmin or OrgAdmin can access everything
  if (roles.includes('superadmin') || roles.includes('orgadmin')) return true;

  // Any-of match
  return allowed.some((r) => roles.includes(r.toLowerCase()));
}

/** Require the user to have ANY of the provided roles */
export const requireRoles = (...allowed: string[]): RequestHandler => {
  return (req, res, next) => {
    const roles = (req.auth?.roles as string[] | undefined) ?? [];
    if (!canAccess(roles, allowed)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

/** Require the user to have ALL of the provided roles (still bypassed by SuperAdmin/OrgAdmin) */
export const requireAllRoles = (...required: string[]): RequestHandler => {
  return (req, res, next) => {
    const roles = normalizeRoles((req.auth?.roles as string[] | undefined) ?? []);

    // Unified bypass: SuperAdmin or OrgAdmin
    if (roles.includes('superadmin') || roles.includes('orgadmin')) return next();

    const ok = required.every((r) => roles.includes(r.toLowerCase()));
    if (!ok) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
};
