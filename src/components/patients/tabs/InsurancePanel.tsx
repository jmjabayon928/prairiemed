// src/components/patients/tabs/InsurancePanel.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { addInsurance, deleteInsurance, listInsurances } from '@/lib/api/patients';
import type { AddInsuranceInput, PatientInsurance } from '@/types/patients';

export default function InsurancePanel({ patientId }: { patientId: string }) {
  const t = useTranslations('patients');
  const [rows, setRows] = useState<PatientInsurance[]>([]);
  const [form, setForm] = useState<AddInsuranceInput>({ payer: '', member_id: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ memoize refresh so it doesn't change every render
  const refresh = useCallback(async () => {
    try {
      const { insurances } = await listInsurances(patientId);
      setRows(insurances);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    }
  }, [patientId]);

  useEffect(() => {
    refresh();
  }, [refresh]); // ✅ now safe

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await addInsurance(patientId, form);
      setForm({ payer: '', member_id: '' });
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
          <label className="block text-sm">{t('insurance.payer')}</label>
          <input
            value={form.payer}
            onChange={(e) => setForm((f) => ({ ...f, payer: e.target.value }))}
            className="border rounded px-2 py-1 dark:bg-gray-900 dark:border-gray-800"
            aria-label="Payer"
            required
          />
        </div>
        <div>
          <label className="block text-sm">{t('insurance.memberId')}</label>
          <input
            value={form.member_id}
            onChange={(e) => setForm((f) => ({ ...f, member_id: e.target.value }))}
            className="border rounded px-2 py-1 dark:bg-gray-900 dark:border-gray-800"
            aria-label="Member ID"
            required
          />
        </div>
        <button
          disabled={busy}
          className="px-3 py-2 rounded bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {t('insurance.add')}
        </button>
      </form>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      <ul className="divide-y dark:divide-gray-800">
        {rows.map((r) => (
          <li key={r.insurance_id} className="py-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.payer}</div>
              <div className="text-sm text-gray-500">{r.member_id}</div>
            </div>
            <button
              onClick={async () => {
                await deleteInsurance(r.insurance_id);
                await refresh();
              }}
              className="text-red-600 hover:underline"
            >
              {t('insurance.remove')}
            </button>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-4 text-center text-gray-500">{t('insurance.empty')}</li>
        )}
      </ul>
    </div>
  );
}
