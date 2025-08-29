// src/components/i18n/LocaleSwitcher.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';

const SUPPORTED_LOCALES = ['en', 'fr'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export default function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  // Split once and normalize the current segment to a plain string
  const [, rawCurrent, ...rest] = pathname.split('/');
  const current = rawCurrent ?? '';

  const currentLocale: SupportedLocale = isSupportedLocale(current) ? current : 'en';

  const options = useMemo(() => SUPPORTED_LOCALES, []);

  function switchTo(next: SupportedLocale) {
    // Write a simple cookie for your server/express i18n (optional)
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;

    // Rebuild the path: /<locale>/<rest...>
    const nextPath = '/' + [next, ...rest].filter(Boolean).join('/');
    router.push(nextPath || '/');
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-gray-500">Language</span>
      <select
        className="rounded-md border px-2 py-1 text-sm"
        value={currentLocale}
        onChange={(e) => switchTo(e.target.value as SupportedLocale)}
      >
        {options.map((loc) => (
          <option key={loc} value={loc}>
            {loc.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
