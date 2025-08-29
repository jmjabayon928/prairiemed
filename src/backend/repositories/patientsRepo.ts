// src/backend/repositories/patientsRepo.ts
import { pool } from '../database/pool';

/** Shared enums */
export type Sex = 'M' | 'F' | 'O';
export type PreferredLanguage = 'en' | 'fr';

export type ContactType = 'next_of_kin' | 'emergency' | 'caregiver';
export type ConsentType = 'treatment' | 'release' | 'research' | 'portal';
export type ConsentStatus = 'granted' | 'revoked' | 'restricted';

/** Row shapes (DB) */
export interface PatientRow {
  patient_id: string;
  first_name: string;
  last_name: string;
  dob: string | null; // ISO date (YYYY-MM-DD) or null
  sex: Sex | null;
  preferred_language: PreferredLanguage | null;
  email: string | null;
  phone: string | null;
  vip: boolean;
  confidential: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientContact {
  id: string;
  patient_id: string;
  type: ContactType;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
}

export interface PatientInsurance {
  id: string;
  patient_id: string;
  payer: string;
  member_id: string;
  group_id: string | null;
  start_date: string | null; // ISO date
  end_date: string | null;   // ISO date
  priority: number;
}

export interface PatientConsent {
  id: string;
  patient_id: string;
  type: ConsentType;
  status: ConsentStatus;
  note: string | null;
  recorded_by: string | null; // user_id
  recorded_at: string;        // ISO timestamp
}

/** Input shapes (service/controller layer) */
export interface CreatePatientInput {
  first_name: string;
  last_name: string;
  dob?: string;
  sex?: Sex;
  preferred_language?: PreferredLanguage;
  email?: string;
  phone?: string;
  vip?: boolean;
  confidential?: boolean;
}
export type UpdatePatientInput = Partial<CreatePatientInput>;

export interface AddContactInput {
  type: ContactType;
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
}
export type UpdateContactInput = Partial<AddContactInput>;

export interface AddInsuranceInput {
  payer: string;
  member_id: string;
  group_id?: string;
  start_date?: string;
  end_date?: string;
  priority?: number; // 1-3
}
export type UpdateInsuranceInput = Partial<AddInsuranceInput>;

export interface AddConsentInput {
  type: ConsentType;
  status: ConsentStatus;
  note?: string;
}
export type UpdateConsentInput = Partial<AddConsentInput>;

/** Utility: dynamic update builder with explicit allowed keys */
function buildUpdate<T extends Record<string, unknown>>(
  patch: T,
  allowed: readonly (keyof T)[],
): { set: string; values: unknown[] } | null {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (Object.hasOwn(patch, key) && patch[key] !== undefined) {
      const value = patch[key];
      fields.push(`${String(key)} = $${idx++}`);
      values.push(value);
    }
  }

  if (fields.length === 0) return null;
  return { set: fields.join(', '), values };
}

/** Patients: search */
export async function searchPatientsRepo(q: string): Promise<PatientRow[]> {
  const sql = `
    SELECT patient_id, first_name, last_name, dob, sex, preferred_language, email, phone, vip, confidential, created_at, updated_at
    FROM patients
    WHERE
      (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)
      OR EXISTS (
        SELECT 1 FROM patient_identifiers pi
        WHERE pi.patient_id = patients.patient_id
          AND pi.value ILIKE $1
      )
    ORDER BY last_name, first_name
    LIMIT 50
  `;
  const { rows } = await pool.query<PatientRow>(sql, [`%${q}%`]);
  return rows;
}

/** Patients: create */
export async function createPatientRepo(data: CreatePatientInput): Promise<PatientRow> {
  const sql = `
    INSERT INTO patients
      (patient_id, first_name, last_name, dob, sex, preferred_language, email, phone, vip, confidential, created_at, updated_at)
    VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7, COALESCE($8,false), COALESCE($9,false), now(), now())
    RETURNING *
  `;

  const params: [
    string,                         // first_name
    string,                         // last_name
    string | null,                  // dob
    Sex | null,                     // sex
    PreferredLanguage | null,       // preferred_language
    string | null,                  // email
    string | null,                  // phone
    boolean,                        // vip
    boolean                         // confidential
  ] = [
    data.first_name,
    data.last_name,
    data.dob ?? null,
    data.sex ?? null,
    data.preferred_language ?? null,
    data.email ?? null,
    data.phone ?? null,
    data.vip ?? false,
    data.confidential ?? false
  ];

  const { rows } = await pool.query<PatientRow>(sql, params);
  const row = rows[0];
  if (!row) {
    // Shouldn’t happen if INSERT ... RETURNING succeeds, but keeps types safe.
    throw new Error('createPatientRepo: INSERT returned no row');
  }
  return row;
}


/** Patients: read by id */
export async function getPatientRepo(id: string): Promise<PatientRow | null> {
  const { rows } = await pool.query<PatientRow>(
    `SELECT * FROM patients WHERE patient_id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

/** Patients: update (dynamic allowed keys) */
export async function updatePatientRepo(id: string, patch: UpdatePatientInput): Promise<PatientRow | null> {
  const update = buildUpdate<UpdatePatientInput>(patch, [
    'first_name',
    'last_name',
    'dob',
    'sex',
    'preferred_language',
    'email',
    'phone',
    'vip',
    'confidential'
  ] as const);

  if (!update) {
    return getPatientRepo(id);
  }

  const sql = `UPDATE patients SET ${update.set}, updated_at = now() WHERE patient_id = $${update.values.length + 1} RETURNING *`;
  const params: unknown[] = [...update.values, id];
  const { rows } = await pool.query<PatientRow>(sql, params);
  return rows[0] ?? null;
}

/** Patients: soft-delete (here we flip confidential as a placeholder) */
export async function softDeletePatientRepo(id: string): Promise<PatientRow | null> {
  const sql = `UPDATE patients SET confidential = true, updated_at = now() WHERE patient_id = $1 RETURNING *`;
  const { rows } = await pool.query<PatientRow>(sql, [id]);
  return rows[0] ?? null;
}

/** Contacts */
export async function listContactsRepo(patientId: string): Promise<PatientContact[]> {
  const { rows } = await pool.query<PatientContact>(
    `SELECT * FROM patient_contacts WHERE patient_id = $1 ORDER BY is_primary DESC, name`,
    [patientId]
  );
  return rows;
}

export async function addContactRepo(
  patientId: string,
  data: AddContactInput
): Promise<PatientContact> {
  const sql = `
    INSERT INTO patient_contacts (id, patient_id, type, name, relationship, phone, email, is_primary)
    VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6, COALESCE($7,false))
    RETURNING *
  `;

  const params: [
    string,                           // patient_id
    AddContactInput['type'],          // type
    string,                           // name
    string | null,                    // relationship
    string | null,                    // phone
    string | null,                    // email
    boolean                           // is_primary
  ] = [
    patientId,
    data.type,
    data.name,
    data.relationship ?? null,
    data.phone ?? null,
    data.email ?? null,
    data.is_primary ?? false,
  ];

  const { rows } = await pool.query<PatientContact>(sql, params);
  const contact = rows[0];
  if (!contact) {
    // Shouldn’t happen if INSERT ... RETURNING succeeds, but keeps types safe.
    throw new Error('addContactRepo: INSERT returned no row');
  }
  return contact;
}


export async function updateContactRepo(contactId: string, patch: UpdateContactInput): Promise<PatientContact | null> {
  const update = buildUpdate<UpdateContactInput>(patch, [
    'type',
    'name',
    'relationship',
    'phone',
    'email',
    'is_primary'
  ] as const);

  if (!update) {
    const { rows } = await pool.query<PatientContact>(`SELECT * FROM patient_contacts WHERE id = $1`, [contactId]);
    return rows[0] ?? null;
  }

  const sql = `UPDATE patient_contacts SET ${update.set} WHERE id = $${update.values.length + 1} RETURNING *`;
  const params: unknown[] = [...update.values, contactId];
  const { rows } = await pool.query<PatientContact>(sql, params);
  return rows[0] ?? null;
}

export async function deleteContactRepo(contactId: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM patient_contacts WHERE id = $1`, [contactId]);
  return (rowCount ?? 0) > 0;
}

/** Insurance */
export async function listInsurancesRepo(patientId: string): Promise<PatientInsurance[]> {
  const { rows } = await pool.query<PatientInsurance>(
    `SELECT * FROM patient_insurances WHERE patient_id = $1 ORDER BY priority ASC, start_date DESC NULLS LAST`,
    [patientId]
  );
  return rows;
}

export async function addInsuranceRepo(
  patientId: string,
  data: AddInsuranceInput
): Promise<PatientInsurance> {
  const sql = `
    INSERT INTO patient_insurances (
      id, patient_id, payer, member_id, group_id, start_date, end_date, priority
    )
    VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7)
    RETURNING *
  `;

  const params: [
    string,                 // patient_id
    string,                 // payer
    string,                 // member_id
    string | null,          // group_id
    string | null,          // start_date
    string | null,          // end_date
    number | null           // priority
  ] = [
    patientId,
    data.payer,
    data.member_id,
    data.group_id ?? null,
    data.start_date ?? null,
    data.end_date ?? null,
    data.priority ?? 1
  ];

  const { rows } = await pool.query<PatientInsurance>(sql, params);
  const insurance = rows[0];
  if (!insurance) {
    // Shouldn’t happen if INSERT ... RETURNING succeeds, but keeps types safe.
    throw new Error('addInsuranceRepo: INSERT returned no row');
  }
  return insurance;
}


export async function updateInsuranceRepo(id: string, patch: UpdateInsuranceInput): Promise<PatientInsurance | null> {
  const update = buildUpdate<UpdateInsuranceInput>(patch, [
    'payer',
    'member_id',
    'group_id',
    'start_date',
    'end_date',
    'priority'
  ] as const);

  if (!update) {
    const { rows } = await pool.query<PatientInsurance>(`SELECT * FROM patient_insurances WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  const sql = `UPDATE patient_insurances SET ${update.set} WHERE id = $${update.values.length + 1} RETURNING *`;
  const params: unknown[] = [...update.values, id];
  const { rows } = await pool.query<PatientInsurance>(sql, params);
  return rows[0] ?? null;
}

export async function deleteInsuranceRepo(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM patient_insurances WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

/** Consents */
export async function listConsentsRepo(patientId: string): Promise<PatientConsent[]> {
  const { rows } = await pool.query<PatientConsent>(
    `SELECT * FROM patient_consents WHERE patient_id = $1 ORDER BY recorded_at DESC`,
    [patientId]
  );
  return rows;
}

export async function addConsentRepo(
  patientId: string,
  userId: string | null,
  data: AddConsentInput
): Promise<PatientConsent> {
  const sql = `
    INSERT INTO patient_consents (
      id, patient_id, type, status, note, recorded_by, recorded_at
    )
    VALUES (gen_random_uuid(), $1,$2,$3,$4,$5, now())
    RETURNING *
  `;

  const params: [
    string,                   // patient_id
    AddConsentInput['type'],  // type
    AddConsentInput['status'],// status
    string | null,            // note
    string | null             // recorded_by
  ] = [
    patientId,
    data.type,
    data.status,
    data.note ?? null,
    userId ?? null,           // ensure exactly string|null for strict/exactOptionalPropertyTypes
  ];

  const { rows } = await pool.query<PatientConsent>(sql, params);
  const consent = rows[0];
  if (!consent) {
    // INSERT ... RETURNING should yield one row; guard for type safety
    throw new Error('addConsentRepo: INSERT returned no row');
  }
  return consent;
}


export async function updateConsentRepo(consentId: string, patch: UpdateConsentInput): Promise<PatientConsent | null> {
  const update = buildUpdate<UpdateConsentInput>(patch, [
    'type',
    'status',
    'note'
  ] as const);

  if (!update) {
    const { rows } = await pool.query<PatientConsent>(`SELECT * FROM patient_consents WHERE id = $1`, [consentId]);
    return rows[0] ?? null;
  }

  const sql = `UPDATE patient_consents SET ${update.set}, recorded_at = now() WHERE id = $${update.values.length + 1} RETURNING *`;
  const params: unknown[] = [...update.values, consentId];
  const { rows } = await pool.query<PatientConsent>(sql, params);
  return rows[0] ?? null;
}
