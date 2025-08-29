// src/components/patients/tabs/ContactsPanel.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  addContact,
  deleteContact,
  listContacts,
  type AddContactInput,
  type PatientContact,
} from '@/lib/api/patients';

type LocalContactForm = {
  type: AddContactInput['type'];
  name: string;
  phone: string;         // keep string for UI
  email?: string;
  relationship?: string;
};

export default function ContactsPanel(
  { patientId }: Readonly<{ patientId: string }>
) {
  const t = useTranslations('patients');
  const [rows, setRows] = useState<PatientContact[]>([]);
  const [form, setForm] = useState<LocalContactForm>({
    type: 'emergency',
    name: '',
    phone: '',
    email: '',
    relationship: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { contacts } = await listContacts(patientId);
      setRows(contacts);
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
      // Build payload without assigning `undefined` to optional fields
      const name = form.name.trim();
      const phone = form.phone.trim();
      const email = (form.email ?? '').trim();
      const relationship = (form.relationship ?? '').trim();

      const payload: AddContactInput = {
        type: form.type,
        name,
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
        ...(relationship ? { relationship } : {}),
      };

      await addContact(patientId, payload);
      setForm({ type: 'emergency', name: '', phone: '', email: '', relationship: '' });
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
          <label className="block text-sm">{t('contacts.type')}</label>
          <select
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value as AddContactInput['type'] }))
            }
            className="border rounded px-2 py-1 dark:bg-gray-900 dark:border-gray-800"
            title="Type"
          >
            <option value="next_of_kin">{t('contacts.types.next_of_kin')}</option>
            <option value="emergency">{t('contacts.types.emergency')}</option>
            <option value="caregiver">{t('contacts.types.caregiver')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm">{t('contacts.name')}</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="border rounded px-2 py-1 dark:bg-gray-900 dark:border-gray-800"
            title="Name"
            required
          />
        </div>

        <div>
          <label className="block text-sm">{t('contacts.phone')}</label>
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="border rounded px-2 py-1 dark:bg-gray-900 dark:border-gray-800"
            title="Phone"
          />
        </div>

        <button
          disabled={busy}
          className="px-3 py-2 rounded bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {t('contacts.add')}
        </button>
      </form>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      <ul className="divide-y dark:divide-gray-800">
        {rows.map((c) => (
          <li key={c.contact_id} className="py-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-gray-500">
                {c.type} • {c.phone ?? '—'}
              </div>
            </div>
            <button
              onClick={async () => {
                await deleteContact(c.contact_id);
                await refresh();
              }}
              className="text-red-600 hover:underline"
            >
              {t('contacts.remove')}
            </button>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="py-4 text-center text-gray-500">{t('contacts.empty')}</li>
        )}
      </ul>
    </div>
  );
}
