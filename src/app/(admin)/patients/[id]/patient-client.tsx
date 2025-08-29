// src/app/(admin)/patients/[id]/patient-client.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getPatient } from '@/lib/api/patients';
import type { Patient } from '@/types/patients';
import PatientTabs from '@/components/patients/PatientTabs';

type Props = Readonly<{ id: string }>;

export default function PatientDetailClient({ id }: Props) {
  const t = useTranslations('patients');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { patient } = await getPatient(id);
        setPatient(patient);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error');
      }
    })();
  }, [id]);

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!patient) return <div className="p-6">{t('loading')}</div>;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">
          {patient.last_name}, {patient.first_name}
        </h1>
        <p className="text-sm text-gray-500">
          {t('detail.mrn')}: {patient.medical_record_number ?? '—'}
        </p>
      </div>
      <PatientTabs patientId={id} />
    </div>
  );
}
