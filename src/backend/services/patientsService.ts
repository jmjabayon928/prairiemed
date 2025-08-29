// src/backend/services/patientsService.ts
import {
  createPatientRepo,
  getPatientRepo,
  searchPatientsRepo,
  updatePatientRepo,
  softDeletePatientRepo,
  listContactsRepo,
  addContactRepo,
  updateContactRepo,
  deleteContactRepo,
  listInsurancesRepo,
  addInsuranceRepo,
  updateInsuranceRepo,
  deleteInsuranceRepo,
  listConsentsRepo,
  addConsentRepo,
  updateConsentRepo,
  type PatientRow,
  type PatientContact,
  type PatientInsurance,
  type PatientConsent,
  type CreatePatientInput,
  type UpdatePatientInput,
  type AddContactInput,
  type UpdateContactInput,
  type AddInsuranceInput,
  type UpdateInsuranceInput,
  type AddConsentInput,
  type UpdateConsentInput
} from '../repositories/patientsRepo';

import { canAccess } from '../middleware/rbac';

/** Auth context passed from controllers */
export interface Requester {
  userId: string;
  roles: string[]; // free-form strings; case-insensitive handled by canAccess
}

/** Small domain errors for controllers to translate to HTTP */
export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/* --------------------------- RBAC Role Sets --------------------------- */
/** View patients (wide read) */
const VIEW_PATIENT_ROLES: string[] = [
  'superadmin',
  'orgadmin',
  'facilityadmin',
  'organizerauditor', // if you use auditors (optional)
  'orgauditor',       // keep aliases if needed
  'privacyofficer',
  'complianceofficer',
  'himmanager',
  'doctor',
  'nurse',
  'nursepractitioner',
  'physicianassistant',
  'nursingassistant',
  'chargenurse',
  'respiratorytherapist',
  'physicaltherapist',
  'occupationaltherapist',
  'dietitian',
  'socialworker',
  'casemanager',
  'registrar',
  'scheduler',
  'receptionist',
  'unitclerk',
  'labtechnologist',
  'labmanager',
  'phlebotomist',
  'radiologytechnologist',
  'radiologymanager',
  'pharmacist',
  'pharmacytechnician',
  'analyst',
  'readonlyviewer'
];

/** Create/update core patient demographics */
const EDIT_PATIENT_ROLES: string[] = [
  'superadmin',
  'orgadmin',
  'facilityadmin',
  'himmanager',
  'doctor',
  'nurse',
  'nursepractitioner',
  'physicianassistant',
  'nursingassistant',
  'chargenurse',
  'registrar',
  'unitclerk',
  'receptionist'
];

/** Soft-delete / confidentiality flips (tighter) */
const DELETE_PATIENT_ROLES: string[] = [
  'superadmin',
  'orgadmin',
  'facilityadmin',
  'himmanager'
];

/** Contacts management */
const VIEW_CONTACTS_ROLES = VIEW_PATIENT_ROLES;
const EDIT_CONTACTS_ROLES = EDIT_PATIENT_ROLES;

/** Insurance management (billing-heavy) */
const VIEW_INSURANCE_ROLES: string[] = [
  ...VIEW_PATIENT_ROLES,
  'billingclerk',
  'billingmanager',
  'insurancespecialist',
  'arspecialist'
];
const EDIT_INSURANCE_ROLES: string[] = [
  'superadmin',
  'orgadmin',
  'facilityadmin',
  'registrar',
  'billingclerk',
  'billingmanager',
  'insurancespecialist',
  'arspecialist',
  'himmanager'
];

/** Consents management (clinicals + HIM) */
const VIEW_CONSENTS_ROLES: string[] = [
  ...VIEW_PATIENT_ROLES,
  'billingclerk',
  'billingmanager',
  'insurancespecialist',
  'arspecialist'
];
const EDIT_CONSENTS_ROLES: string[] = [
  'superadmin',
  'orgadmin',
  'facilityadmin',
  'doctor',
  'nurse',
  'nursepractitioner',
  'physicianassistant',
  'himmanager'
];

/* --------------------------- Helpers --------------------------- */
function requireAccess(requester: Requester, allowed: string[]): void {
  if (!canAccess(requester.roles, allowed)) {
    throw new ForbiddenError();
  }
}

async function ensurePatientExists(patientId: string): Promise<PatientRow> {
  const row = await getPatientRepo(patientId);
  if (!row) {
    throw new NotFoundError('Patient not found');
  }
  return row;
}

/* --------------------------- Patients --------------------------- */
export async function searchPatientsService(
  requester: Requester,
  q: string
): Promise<PatientRow[]> {
  requireAccess(requester, VIEW_PATIENT_ROLES);
  return searchPatientsRepo(q);
}

export async function createPatientService(
  requester: Requester,
  data: CreatePatientInput
): Promise<PatientRow> {
  requireAccess(requester, EDIT_PATIENT_ROLES);
  return createPatientRepo(data);
}

export async function getPatientByIdService(
  requester: Requester,
  patientId: string
): Promise<PatientRow> {
  requireAccess(requester, VIEW_PATIENT_ROLES);
  const row = await getPatientRepo(patientId);
  if (!row) throw new NotFoundError('Patient not found');
  return row;
}

export async function updatePatientService(
  requester: Requester,
  patientId: string,
  patch: UpdatePatientInput
): Promise<PatientRow> {
  requireAccess(requester, EDIT_PATIENT_ROLES);
  await ensurePatientExists(patientId);
  const updated = await updatePatientRepo(patientId, patch);
  if (!updated) throw new NotFoundError('Patient not found');
  return updated;
}

export async function softDeletePatientService(
  requester: Requester,
  patientId: string
): Promise<PatientRow> {
  requireAccess(requester, DELETE_PATIENT_ROLES);
  await ensurePatientExists(patientId);
  const updated = await softDeletePatientRepo(patientId);
  if (!updated) throw new NotFoundError('Patient not found');
  return updated;
}

/* --------------------------- Contacts --------------------------- */
export async function listContactsService(
  requester: Requester,
  patientId: string
): Promise<PatientContact[]> {
  requireAccess(requester, VIEW_CONTACTS_ROLES);
  await ensurePatientExists(patientId);
  return listContactsRepo(patientId);
}

export async function addContactService(
  requester: Requester,
  patientId: string,
  input: AddContactInput
): Promise<PatientContact> {
  requireAccess(requester, EDIT_CONTACTS_ROLES);
  await ensurePatientExists(patientId);
  return addContactRepo(patientId, input);
}

export async function updateContactService(
  requester: Requester,
  contactId: string,
  patch: UpdateContactInput
): Promise<PatientContact> {
  requireAccess(requester, EDIT_CONTACTS_ROLES);
  const row = await updateContactRepo(contactId, patch);
  if (!row) throw new NotFoundError('Contact not found');
  return row;
}

export async function deleteContactService(
  requester: Requester,
  contactId: string
): Promise<boolean> {
  requireAccess(requester, EDIT_CONTACTS_ROLES);
  return deleteContactRepo(contactId);
}

/* --------------------------- Insurance --------------------------- */
export async function listInsurancesService(
  requester: Requester,
  patientId: string
): Promise<PatientInsurance[]> {
  requireAccess(requester, VIEW_INSURANCE_ROLES);
  await ensurePatientExists(patientId);
  return listInsurancesRepo(patientId);
}

export async function addInsuranceService(
  requester: Requester,
  patientId: string,
  input: AddInsuranceInput
): Promise<PatientInsurance> {
  requireAccess(requester, EDIT_INSURANCE_ROLES);
  await ensurePatientExists(patientId);
  return addInsuranceRepo(patientId, input);
}

export async function updateInsuranceService(
  requester: Requester,
  insuranceId: string,
  patch: UpdateInsuranceInput
): Promise<PatientInsurance> {
  requireAccess(requester, EDIT_INSURANCE_ROLES);
  const row = await updateInsuranceRepo(insuranceId, patch);
  if (!row) throw new NotFoundError('Insurance not found');
  return row;
}

export async function deleteInsuranceService(
  requester: Requester,
  insuranceId: string
): Promise<boolean> {
  requireAccess(requester, EDIT_INSURANCE_ROLES);
  return deleteInsuranceRepo(insuranceId);
}

/* --------------------------- Consents --------------------------- */
export async function listConsentsService(
  requester: Requester,
  patientId: string
): Promise<PatientConsent[]> {
  requireAccess(requester, VIEW_CONSENTS_ROLES);
  await ensurePatientExists(patientId);
  return listConsentsRepo(patientId);
}

export async function addConsentService(
  requester: Requester,
  patientId: string,
  input: AddConsentInput
): Promise<PatientConsent> {
  requireAccess(requester, EDIT_CONSENTS_ROLES);
  const recordedBy = requester.userId || null;
  await ensurePatientExists(patientId);
  return addConsentRepo(patientId, recordedBy, input);
}

export async function updateConsentService(
  requester: Requester,
  consentId: string,
  patch: UpdateConsentInput
): Promise<PatientConsent> {
  requireAccess(requester, EDIT_CONSENTS_ROLES);
  const row = await updateConsentRepo(consentId, patch);
  if (!row) throw new NotFoundError('Consent not found');
  return row;
}
