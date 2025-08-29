'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ContactsPanel from './tabs/ContactsPanel';
import InsurancePanel from './tabs/InsurancePanel';
import ConsentsPanel from './tabs/ConsentsPanel';

type TabKey = 'contacts' | 'insurance' | 'consents';

export default function PatientTabs({ patientId }: { patientId: string }) {
  const t = useTranslations('patients');
  const [tab, setTab] = useState<TabKey>('contacts');

  return (
    <div>
      <div className="flex gap-2 border-b dark:border-gray-800 mb-4">
        {(['contacts','insurance','consents'] as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 border-b-2 ${
              tab === k ? 'border-brand-500 text-brand-600' : 'border-transparent'
            }`}
          >
            {t(`tabs.${k}`)}
          </button>
        ))}
      </div>

      {tab === 'contacts' && <ContactsPanel patientId={patientId} />}
      {tab === 'insurance' && <InsurancePanel patientId={patientId} />}
      {tab === 'consents' && <ConsentsPanel patientId={patientId} />}
    </div>
  );
}
