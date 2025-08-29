// src/components/patients/tabs/ConsentsPanel.tsx
'use client';

import {useCallback, useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {addConsent, listConsents} from '@/lib/api/patients';
import type {AddConsentInput, ConsentStatus, ConsentType, PatientConsent} from '@/types/patients';

export default function ConsentsPanel({ patientId }: { patientId: string }) {
  const t = useTranslations('patients');
  const [rows, setRows] = useState<PatientConsent[]>([]);
  const [form, setForm] = useState<AddConsentInput>({ type: 'treatment', status: 'granted' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { consents } = await listConsents(patientId);
      setRows(consents);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    }
  }, [patientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await addConsent(patientId, form);
      setForm({ type: 'treatment', status: 'granted' });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onAdd} className="flex gap-2 items-end flex-wrap">
        <div>
          <label className="block text-sm">{t('consents.type')}</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ConsentType }))}
            className="border rounded px-2 py-1 dark:bg-gray-900 dark:border-gray-800"
            title="Consent Type"
          >
            <option value="treatment">{t('consents.types.treatment')}</option>
            <option value="release">{t('consents.types.release')}</option>
            <option value="research">{t('consents.types.research')}</option>
            <option value="portal">{t('consents.types.portal')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">{t('consents.status')}</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ConsentStatus }))}
            className="border rounded px-2 py-1 dark:bg-gray-900 dark:border-gray-800"
            title="Consent Status"
          >
            <option value="granted">{t('consents.statuses.granted')}</option>
            <option value="revoked">{t('consents.statuses.revoked')}</option>
            <option value="restricted">{t('consents.statuses.restricted')}</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-3 py-2 rounded bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {t('consents.add')}
        </button>
      </form>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      <ul className="divide-y dark:divide-gray-800">
        {rows.map((r) => (
          <li key={r.consent_id} className="py-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{t(`consents.types.${r.type}`)}</div>
              <div className="text-sm text-gray-500">{t(`consents.statuses.${r.status}`)}</div>
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-4 text-center text-gray-500">{t('consents.empty')}</li>
        )}
      </ul>
    </div>
  );
}
