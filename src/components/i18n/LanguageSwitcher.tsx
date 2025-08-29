// src/components/i18n/LanguageSwitcher.tsx
'use client';

import {useLocale, useTranslations} from 'next-intl';
import {usePathname} from 'next/navigation';

type Props = { className?: string; compact?: boolean };

export default function LanguageSwitcher({ className, compact }: Props) {
  const locale = useLocale();
  const t = useTranslations('common');
  const pathname = usePathname();

  return (
    <form action="/api/i18n/set-locale" method="POST" className={className}>
      {!compact && (
        <label htmlFor="locale" className="sr-only">
          {t('lang.label')}
        </label>
      )}
      <input type="hidden" name="returnTo" value={pathname || '/'} />
      <select
        id="locale"
        name="locale"
        defaultValue={locale}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        suppressHydrationWarning // <— add this
        className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-sm"
        aria-label={t('lang.label')}
      >
        <option value="en">{t('lang.en')}</option>
        <option value="fr">{t('lang.fr')}</option>
      </select>
    </form>
  );
}
