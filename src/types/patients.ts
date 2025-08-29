export type Sex = 'M' | 'F' | 'O';

export interface PatientSummary {
  patient_id: string;
  medical_record_number: string | null;
  first_name: string;
  last_name: string;
  dob: string | null; // YYYY-MM-DD
  sex: Sex | null;
  phone: string | null;
  email: string | null;
  preferred_language: 'en' | 'fr' | null;
  vip: boolean;
  confidential: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient extends PatientSummary {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface CreatePatientInput {
  first_name: string;
  last_name: string;
  dob?: string;
  sex?: Sex;
  preferred_language?: 'en' | 'fr';
  email?: string;
  phone?: string;
  vip?: boolean;
  confidential?: boolean;
}

/** Update shapes are simply partials of their create inputs */
export type UpdatePatientInput = Partial<CreatePatientInput>;

export type ContactType = 'next_of_kin' | 'emergency' | 'caregiver';

export interface PatientContact {
  contact_id: string;
  patient_id: string;
  type: ContactType;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddContactInput {
  type: ContactType;
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export type UpdateContactInput = Partial<AddContactInput>;

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

export interface AddInsuranceInput {
  payer: string;
  member_id: string;
  group_id?: string;
  start_date?: string;
  end_date?: string;
  priority?: number;
}

export type UpdateInsuranceInput = Partial<AddInsuranceInput>;

export type ConsentType = 'treatment' | 'release' | 'research' | 'portal';
export type ConsentStatus = 'granted' | 'revoked' | 'restricted';

export interface PatientConsent {
  consent_id: string;
  patient_id: string;
  type: ConsentType;
  status: ConsentStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddConsentInput {
  type: ConsentType;
  status: ConsentStatus;
  note?: string;
}

export type UpdateConsentInput = Partial<AddConsentInput>;
