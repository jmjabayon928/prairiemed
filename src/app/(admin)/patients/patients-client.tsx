'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { searchPatients } from '@/lib/api/patients';
import type { PatientSummary } from '@/types/patients';
import Link from 'next/link';

export default function PatientsListClient() {
  const t = useTranslations('patients');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const placeholder = useMemo(() => t('search.placeholder'), [t]);

  async function runSearch(term: string) {
    setLoading(true);
    setErr(null);
    try {
      const { patients } = await searchPatients(term || 'a'); // tiny seed to list some
      setRows(patients);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runSearch(''); }, []); // initial load

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">{t('title')}</h1>

      <div className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="border rounded px-3 py-2 w-full dark:bg-gray-900 dark:border-gray-800"
          aria-label={t('search.aria')}
        />
        <button
          onClick={() => runSearch(q)}
          className="px-4 py-2 rounded bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60"
          disabled={loading}
        >
          {t('search.button')}
        </button>
      </div>

      {err && <div className="text-red-600 text-sm mb-2">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b dark:border-gray-800">
              <th className="py-2 pr-4">{t('table.name')}</th>
              <th className="py-2 pr-4">{t('table.dob')}</th>
              <th className="py-2 pr-4">{t('table.mrn')}</th>
              <th className="py-2 pr-4">{t('table.phone')}</th>
              <th className="py-2 pr-4">{t('table.email')}</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.patient_id} className="border-b dark:border-gray-800">
                <td className="py-2 pr-4">{p.last_name}, {p.first_name}</td>
                <td className="py-2 pr-4">{p.dob ?? '—'}</td>
                <td className="py-2 pr-4">{p.medical_record_number ?? '—'}</td>
                <td className="py-2 pr-4">{p.phone ?? '—'}</td>
                <td className="py-2 pr-4">{p.email ?? '—'}</td>
                <td className="py-2 pr-4">
                  <Link href={`/patients/${p.patient_id}`} className="text-brand-500 hover:underline">
                    {t('table.view')}
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-500">{t('table.empty')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
