// src/backend/routes/patientsRoutes.ts
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRoles } from '../middleware/rbac';

// Controllers
import {
  searchPatientsHandler,
  createPatientHandler,
  getPatientByIdHandler,
  updatePatientHandler,
  softDeletePatientHandler,
  listContactsHandler,
  addContactHandler,
  updateContactHandler,
  deleteContactHandler,
  listInsurancesHandler,
  addInsuranceHandler,
  updateInsuranceHandler,
  deleteInsuranceHandler,
  listConsentsHandler,
  addConsentHandler,
  updateConsentHandler
} from '../controllers/patientsController';

// Validators (correct path & names)
import {
  // patients
  searchPatientsQuerySchema,
  createPatientSchema,
  updatePatientSchema,
  idParamSchema,

  // contacts
  addContactSchema,
  updateContactSchema,
  contactIdParamSchema,

  // insurances
  addInsuranceSchema,
  updateInsuranceSchema,
  insuranceIdParamSchema,

  // consents
  addConsentSchema,
  updateConsentSchema,
  consentIdParamSchema
} from '../validators/patientsSchemas';

const router = Router();

/* ------------------------------------------------------------------ */
/* Role sets for coarse route gating (services still do final checks) */
/* ------------------------------------------------------------------ */

// Broad read access (match service VIEW_PATIENT_ROLES)
const VIEW_PATIENT_ROLES: string[] = [
  'superadmin', 'orgadmin', 'facilityadmin',
  'orgauditor', 'privacyofficer', 'complianceofficer',
  'himmanager',
  'doctor', 'nurse', 'nursepractitioner', 'physicianassistant',
  'nursingassistant', 'chargenurse',
  'respiratorytherapist', 'physicaltherapist', 'occupationaltherapist',
  'dietitian', 'socialworker', 'casemanager',
  'registrar', 'scheduler', 'receptionist', 'unitclerk',
  'labtechnologist', 'labmanager', 'phlebotomist',
  'radiologytechnologist', 'radiologymanager',
  'pharmacist', 'pharmacytechnician',
  'analyst', 'readonlyviewer'
];

const EDIT_PATIENT_ROLES: string[] = [
  'superadmin', 'orgadmin', 'facilityadmin',
  'himmanager',
  'doctor', 'nurse', 'nursepractitioner', 'physicianassistant',
  'nursingassistant', 'chargenurse',
  'registrar', 'unitclerk', 'receptionist'
];

const DELETE_PATIENT_ROLES: string[] = [
  'superadmin', 'orgadmin', 'facilityadmin', 'himmanager'
];

const VIEW_CONTACTS_ROLES = VIEW_PATIENT_ROLES;
const EDIT_CONTACTS_ROLES = EDIT_PATIENT_ROLES;

const VIEW_INSURANCE_ROLES: string[] = [
  ...VIEW_PATIENT_ROLES,
  'billingclerk', 'billingmanager', 'insurancespecialist', 'arspecialist'
];

const EDIT_INSURANCE_ROLES: string[] = [
  'superadmin', 'orgadmin', 'facilityadmin',
  'registrar', 'billingclerk', 'billingmanager', 'insurancespecialist', 'arspecialist',
  'himmanager'
];

const VIEW_CONSENTS_ROLES: string[] = [
  ...VIEW_PATIENT_ROLES,
  'billingclerk', 'billingmanager', 'insurancespecialist', 'arspecialist'
];

const EDIT_CONSENTS_ROLES: string[] = [
  'superadmin', 'orgadmin', 'facilityadmin',
  'doctor', 'nurse', 'nursepractitioner', 'physicianassistant', 'himmanager'
];

/* --------------------------- Global guard --------------------------- */
// Require a valid session/JWT for every route in this module
router.use(requireAuth);

/* ------------------------------ Patients ------------------------------ */

// GET /patients?q=...
router.get(
  '/',
  requireRoles(...VIEW_PATIENT_ROLES),
  validate(searchPatientsQuerySchema, 'query'),
  searchPatientsHandler
);

// POST /patients
router.post(
  '/',
  requireRoles(...EDIT_PATIENT_ROLES),
  validate(createPatientSchema, 'body'),
  createPatientHandler
);

// GET /patients/:id
router.get(
  '/:id',
  requireRoles(...VIEW_PATIENT_ROLES),
  validate(idParamSchema, 'params'),
  getPatientByIdHandler
);

// PATCH /patients/:id
router.patch(
  '/:id',
  requireRoles(...EDIT_PATIENT_ROLES),
  validate(idParamSchema, 'params'),
  validate(updatePatientSchema, 'body'),
  updatePatientHandler
);

// DELETE /patients/:id  (soft-delete)
router.delete(
  '/:id',
  requireRoles(...DELETE_PATIENT_ROLES),
  validate(idParamSchema, 'params'),
  softDeletePatientHandler
);

/* ------------------------------ Contacts ------------------------------ */

// GET /patients/:id/contacts
router.get(
  '/:id/contacts',
  requireRoles(...VIEW_CONTACTS_ROLES),
  validate(idParamSchema, 'params'),
  listContactsHandler
);

// POST /patients/:id/contacts
router.post(
  '/:id/contacts',
  requireRoles(...EDIT_CONTACTS_ROLES),
  validate(idParamSchema, 'params'),
  validate(addContactSchema, 'body'),
  addContactHandler
);

// PATCH /patients/contacts/:contactId
router.patch(
  '/contacts/:contactId',
  requireRoles(...EDIT_CONTACTS_ROLES),
  validate(contactIdParamSchema, 'params'),
  validate(updateContactSchema, 'body'),
  updateContactHandler
);

// DELETE /patients/contacts/:contactId
router.delete(
  '/contacts/:contactId',
  requireRoles(...EDIT_CONTACTS_ROLES),
  validate(contactIdParamSchema, 'params'),
  deleteContactHandler
);

/* ----------------------------- Insurances ----------------------------- */

// GET /patients/:id/insurances
router.get(
  '/:id/insurances',
  requireRoles(...VIEW_INSURANCE_ROLES),
  validate(idParamSchema, 'params'),
  listInsurancesHandler
);

// POST /patients/:id/insurances
router.post(
  '/:id/insurances',
  requireRoles(...EDIT_INSURANCE_ROLES),
  validate(idParamSchema, 'params'),
  validate(addInsuranceSchema, 'body'),
  addInsuranceHandler
);

// PATCH /patients/insurances/:insuranceId
router.patch(
  '/insurances/:insuranceId',
  requireRoles(...EDIT_INSURANCE_ROLES),
  validate(insuranceIdParamSchema, 'params'),
  validate(updateInsuranceSchema, 'body'),
  updateInsuranceHandler
);

// DELETE /patients/insurances/:insuranceId
router.delete(
  '/insurances/:insuranceId',
  requireRoles(...EDIT_INSURANCE_ROLES),
  validate(insuranceIdParamSchema, 'params'),
  deleteInsuranceHandler
);

/* ------------------------------- Consents ------------------------------ */

// GET /patients/:id/consents
router.get(
  '/:id/consents',
  requireRoles(...VIEW_CONSENTS_ROLES),
  validate(idParamSchema, 'params'),
  listConsentsHandler
);

// POST /patients/:id/consents
router.post(
  '/:id/consents',
  requireRoles(...EDIT_CONSENTS_ROLES),
  validate(idParamSchema, 'params'),
  validate(addConsentSchema, 'body'),
  addConsentHandler
);

// PATCH /patients/consents/:consentId
router.patch(
  '/consents/:consentId',
  requireRoles(...EDIT_CONSENTS_ROLES),
  validate(consentIdParamSchema, 'params'),
  validate(updateConsentSchema, 'body'),
  updateConsentHandler
);

export default router;
