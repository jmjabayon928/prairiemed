// src/lib/auth/constants.ts

// Session cookie name used for authentication
export const AUTH_COOKIE = 'pm_session';

// Locale cookie name used for i18n
export const LOCALE_COOKIE = 'pm_locale';

// Supported locales for PrairieMed (expand if you add more)
export const SUPPORTED_LOCALES = ['en', 'fr'] as const;

// Type-safe locale type
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

// Public routes that never require authentication
export const PUBLIC_PATHS = ['/signin'] as const;
