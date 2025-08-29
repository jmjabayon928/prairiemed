'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {AuthContext} from '@/components/auth/AuthContext';
import type {AuthUser} from '@/lib/auth/authClient';
import type {SupportedLocale} from '@/lib/auth/constants';

const API = '/api';
const LOCALE_COOKIE = 'pm_locale';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

export default function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

  // Bootstrap locale from cookie on first client render
  useEffect(() => {
    const fromCookie = readCookie(LOCALE_COOKIE);
    if (fromCookie === 'en' || fromCookie === 'fr') {
      setLocaleState(fromCookie);
    }
  }, []);

  const fetchMe = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store'
      });
      if (!res.ok) return false;
      const data = await res.json();
      setUser(data.user as AuthUser);
      return true;
    } catch {
      return false;
    }
  }, []);

  const tryRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  // On mount: me → (if needed) refresh → me
  useEffect(() => {
    (async () => {
      let ok = await fetchMe();
      if (!ok) {
        const refreshed = await tryRefresh();
        if (refreshed) ok = await fetchMe();
      }
      if (!ok) setUser(null);
    })();
  }, [fetchMe, tryRefresh]);

  const login = useCallback(
    async (email: string, password: string, remember?: boolean) => {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password, remember: !!remember})
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data && data.error) || 'Login failed');
      }
      // After successful login, backend also sets pm_locale; sync it locally
      const fromCookie = readCookie(LOCALE_COOKIE);
      if (fromCookie === 'en' || fromCookie === 'fr') {
        setLocaleState(fromCookie);
      }
      await fetchMe();
    },
    [fetchMe]
  );

  const logout = useCallback(async () => {
    await fetch(`${API}/auth/logout`, {method: 'POST', credentials: 'include'});
    setUser(null);
  }, []);

  const setLocale = useCallback(async (next: SupportedLocale) => {
    const form = new FormData();
    form.set('locale', next);
    form.set('returnTo', '/'); // Express ignores this; harmless
    await fetch(`${API}/i18n/set-locale`, {
      method: 'POST',
      body: form,
      credentials: 'include'
    });
    // Update local state so UI reflects change immediately
    setLocaleState(next);
  }, []);

  const value = useMemo(
    () => ({
      user,
      locale,
      login,
      logout,
      setLocale
    }),
    [user, locale, login, logout, setLocale]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
