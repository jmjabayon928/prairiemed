// src/lib/auth/constants.ts
export const AUTH_COOKIE = 'access_token';
export const LOCALE_COOKIE = 'pm_locale';
export const SUPPORTED_LOCALES = ['en', 'fr'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const PUBLIC_PATHS = ['/signin', '/api/auth/*']; 