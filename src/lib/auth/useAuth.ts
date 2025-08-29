// src/lib/auth/useAuth.ts
/**
 * React hook for auth state:
 * - Tracks user, loading, error
 * - Fetches /me on mount (authClient will auto-refresh on 401)
 * - Exposes login/logout/refresh
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  login as apiLogin,
  logout as apiLogout,
  me as apiMe,
} from './authClient';

export type { AuthUser } from './authClient';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<import('./authClient').AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Load current user (auto-refresh handled inside authClient.fetchWithAuth) */
  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await apiMe();
      setUser(u);
    } catch (err: unknown) {
      setUser(null);
      setError(err instanceof Error ? err.message : 'Unauthorized');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // On app start, try getting the current user
    void fetchUser();
  }, [fetchUser]);

  /** Sign in and update local user state */
  const login = useCallback(async (email: string, password: string, remember = false) => {
    setError(null);
    const res = await apiLogin(email, password, remember);
    setUser(res.user);
    return res.user;
  }, []);

  /** Sign out, clear state, and send user to /signin */
  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    router.push('/signin');
  }, [router]);

  return { user, loading, error, login, logout, refresh: fetchUser } as const;
}
