// src/types/intl-formats.d.ts
// Minimal global so next-intl/use-intl type defs compile without importing from 'use-intl/core'.
// This mirrors the keys next-intl expects to exist on IntlFormats.
declare global {
  type IntlFormats = {
    dateTime?: Record<string, Intl.DateTimeFormatOptions>;
    number?: Record<string, Intl.NumberFormatOptions>;
    list?: Record<string, Intl.ListFormatOptions>;
    relativeTime?: Record<
      string,
      { now?: number } & Intl.RelativeTimeFormatOptions
    >;
  };
}
export {};
