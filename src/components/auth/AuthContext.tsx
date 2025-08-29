'use client';

import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '@/lib/auth/authClient';
import type { SupportedLocale } from '@/lib/auth/constants';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

export interface AuthContextValue {
  user: AuthUser | null;
  locale: SupportedLocale;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setLocale: (locale: SupportedLocale) => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthContext not found. Wrap your app in <AuthProvider>.');
  return ctx;
}

// ---------- Provider implementation ----------
const API = '/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as SupportedLocale;

  // Fetch current user once (relies on your /auth/me using cookies)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (active) setUser(data.user as AuthUser);
        } else {
          if (active) setUser(null);
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(msg || 'Login failed');
    }
    const data = await res.json();
    setUser(data.user as AuthUser);
    router.replace('/'); // go to dashboard root
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
      router.push('/signin');
    }
  }, [router]);

  // Post to your Express route so server sets pm_locale and redirects back
  const setLocale = useCallback(async (next: SupportedLocale) => {
    // Build and submit a form to trigger server-side redirect
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `/api/i18n/set-locale`;

    const fLocale = document.createElement('input');
    fLocale.type = 'hidden';
    fLocale.name = 'locale';
    fLocale.value = next;
    form.appendChild(fLocale);

    const fReturn = document.createElement('input');
    fReturn.type = 'hidden';
    fReturn.name = 'returnTo';
    fReturn.value = pathname || '/';
    form.appendChild(fReturn);

    document.body.appendChild(form);
    form.submit();
  }, [pathname]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    locale,
    login,
    logout,
    setLocale,
  }), [user, locale, login, logout, setLocale]);

  // Optionally, avoid flashing children until we know if user exists
  if (!loaded) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
