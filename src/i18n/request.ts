import {getRequestConfig} from 'next-intl/server';
import {headers} from 'next/headers';
import type {AbstractIntlMessages} from 'next-intl';
import {LOCALE_COOKIE, SUPPORTED_LOCALES} from '@/lib/auth/constants';

// List only the namespaces you actually have
const NAMESPACES = [
  'common',
  'auth',
  'patients' 
] as const;

const DEFAULT_LOCALE = 'en' as const;

function getCookieValue(name: string, cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

export default getRequestConfig(async () => {
  const hdrs = await headers();
  const cookieHeader = hdrs.get('cookie');
  const fromCookie = getCookieValue(LOCALE_COOKIE, cookieHeader);

  const locale = (SUPPORTED_LOCALES as readonly string[]).includes(fromCookie || '')
    ? (fromCookie as (typeof SUPPORTED_LOCALES)[number])
    : DEFAULT_LOCALE;

  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        const mod = await import(`@/messages/${locale}/${ns}.json`);
        return [ns, mod.default] as const;
      } catch {
        console.warn(`[i18n] Missing messages file: ${locale}/${ns}.json — using empty object`);
        return [ns, {}] as const;
      }
    })
  );

  const messages = Object.fromEntries(entries) as AbstractIntlMessages;
  return {locale, messages};
});
