// src/lib/api/patients.ts
// Uses Next.js rewrite to hit your Express backend via same-origin `/api`.
// Make sure next.config rewrites `/api` -> http://localhost:<backend-port>
// so we avoid CORS and keep cookies working.

import type { Patient } from '@/types/patients';

const API_BASE = '/api';
const JSON_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include', // send cookies for auth
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init?.headers || {}),
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!res.ok) {
    let detail = '';
    if (isJson) {
      try {
        const body = (await res.json()) as Record<string, unknown>;
        detail =
          (typeof body.error === 'string' && body.error) ||
          (typeof body.message === 'string' && body.message) ||
          JSON.stringify(body);
      } catch {
        // ignore
      }
    } else {
      try {
        const text = await res.text();
        detail = text.slice(0, 200);
      } catch {
        // ignore
      }
    }
    throw new Error(`API ${res.status}: ${detail || res.statusText}`);
  }

  if (!isJson) {
    const text = await res.text();
    throw new Error(`API returned non-JSON: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

/* ============================== Types ============================== */

export type Sex = 'M' | 'F' | 'O';

export interface PatientSummary {
  patient_id: string;
  medical_record_number: string | null;
  first_name: string;
  last_name: string;
  dob: string | null;
  sex: Sex | null;
  phone: string | null;
  email: string | null;
  preferred_language: 'en' | 'fr' | null;
  vip: boolean;
  confidential: boolean;
  created_at: string;
  updated_at: string;
}

// If your GET /patients/:id returns more than PatientSummary, extend here:
export type PatientDetail = PatientSummary & {
  // add optional detailed fields here when your API returns them
};

export interface AddContactInput {
  type: 'next_of_kin' | 'emergency' | 'caregiver';
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
}
export interface PatientContact {
  contact_id: string;
  patient_id: string;
  type: AddContactInput['type'];
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddInsuranceInput {
  payer: string;
  member_id: string;
  group_id?: string;
  start_date?: string;
  end_date?: string;
  priority?: number;
}
export interface PatientInsurance {
  insurance_id: string;
  patient_id: string;
  payer: string;
  member_id: string;
  group_id: string | null;
  start_date: string | null;
  end_date: string | null;
  priority: number | null;
  created_at: string;
  updated_at: string;
}

export type ConsentType = 'treatment' | 'release' | 'research' | 'portal';
export type ConsentStatus = 'granted' | 'revoked' | 'restricted';
export interface AddConsentInput {
  type: ConsentType;
  status: ConsentStatus;
  note?: string;
}
export interface PatientConsent {
  consent_id: string;
  patient_id: string;
  type: ConsentType;
  status: ConsentStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/* ============================== API calls ============================== */

// Patients
export async function searchPatients(
  q: string
): Promise<{ patients: PatientSummary[] }> {
  const url = `${API_BASE}/patients?q=${encodeURIComponent(q)}`;
  return fetchJson(url);
}

// ✅ Added: getPatient (matches your build’s expected named export)
export async function getPatient(id: string): Promise<{ patient: Patient }> {
  return fetchJson(`${API_BASE}/patients/${encodeURIComponent(id)}`);
}

// Contacts
export async function listContacts(
  patientId: string
): Promise<{ contacts: PatientContact[] }> {
  return fetchJson(`${API_BASE}/patients/${encodeURIComponent(patientId)}/contacts`);
}

export async function addContact(
  patientId: string,
  input: AddContactInput
): Promise<{ contact: PatientContact }> {
  return fetchJson(`${API_BASE}/patients/${encodeURIComponent(patientId)}/contacts`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateContact(
  contactId: string,
  input: Partial<AddContactInput>
): Promise<{ contact: PatientContact }> {
  return fetchJson(`${API_BASE}/patients/contacts/${encodeURIComponent(contactId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteContact(
  contactId: string
): Promise<{ ok: true }> {
  return fetchJson(`${API_BASE}/patients/contacts/${encodeURIComponent(contactId)}`, {
    method: 'DELETE',
  });
}

// Insurance  (🔧 fixed to plural to match your Express routes)
export async function listInsurances(
  patientId: string
): Promise<{ insurances: PatientInsurance[] }> {
  return fetchJson(`${API_BASE}/patients/${encodeURIComponent(patientId)}/insurances`);
}

export async function addInsurance(
  patientId: string,
  input: AddInsuranceInput
): Promise<{ insurance: PatientInsurance }> {
  return fetchJson(`${API_BASE}/patients/${encodeURIComponent(patientId)}/insurances`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateInsurance(
  insuranceId: string,
  input: Partial<AddInsuranceInput>
): Promise<{ insurance: PatientInsurance }> {
  return fetchJson(`${API_BASE}/patients/insurances/${encodeURIComponent(insuranceId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteInsurance(
  insuranceId: string
): Promise<{ ok: true }> {
  return fetchJson(`${API_BASE}/patients/insurances/${encodeURIComponent(insuranceId)}`, {
    method: 'DELETE',
  });
}

// Consents
export async function listConsents(
  patientId: string
): Promise<{ consents: PatientConsent[] }> {
  return fetchJson(`${API_BASE}/patients/${encodeURIComponent(patientId)}/consents`);
}

export async function addConsent(
  patientId: string,
  input: AddConsentInput
): Promise<{ consent: PatientConsent }> {
  return fetchJson(`${API_BASE}/patients/${encodeURIComponent(patientId)}/consents`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateConsent(
  consentId: string,
  input: Partial<AddConsentInput>
): Promise<{ consent: PatientConsent }> {
  return fetchJson(`${API_BASE}/patients/consents/${encodeURIComponent(consentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteConsent(
  consentId: string
): Promise<{ ok: true }> {
  return fetchJson(`${API_BASE}/patients/consents/${encodeURIComponent(consentId)}`, {
    method: 'DELETE',
  });
}
