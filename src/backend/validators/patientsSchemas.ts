// src/backend/validators/patientsSchemas.ts
import { z } from 'zod';

/** Reusable helpers */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD
  .optional();

/* ------------------------------ Patients ------------------------------ */

export const searchSchema = z.object({
  q: z.string().min(1).max(100)
});

// Alias used by routes (same schema, different export name for clarity)
export const searchPatientsQuerySchema = searchSchema;

export const createPatientSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  dob: isoDate,
  sex: z.enum(['M', 'F', 'O']).optional(),
  preferred_language: z.enum(['en', 'fr']).optional(),
  // allow empty string -> undefined for optional text fields commonly bound from forms
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().optional().or(z.literal('').transform(() => undefined)),
  vip: z.boolean().optional(),
  confidential: z.boolean().optional()
});

export const updatePatientSchema = createPatientSchema.partial();

/* ------------------------------ Contacts ------------------------------ */

export const addContactSchema = z.object({
  type: z.enum(['next_of_kin', 'emergency', 'caregiver']),
  name: z.string().min(1),
  relationship: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional()
});

export const updateContactSchema = addContactSchema.partial();

/* ------------------------------ Insurance ----------------------------- */

export const addInsuranceSchema = z.object({
  payer: z.string().min(1),
  member_id: z.string().min(1),
  group_id: z.string().optional(),
  start_date: isoDate,
  end_date: isoDate,
  priority: z.number().int().min(1).max(3).default(1)
});

export const updateInsuranceSchema = addInsuranceSchema.partial();

/* ------------------------------- Consents ----------------------------- */

export const addConsentSchema = z.object({
  type: z.enum(['treatment', 'release', 'research', 'portal']),
  status: z.enum(['granted', 'revoked', 'restricted']),
  note: z.string().optional()
});

export const updateConsentSchema = addConsentSchema.partial();

/* ---------------------------- Path params ----------------------------- */
/** If your IDs are not UUIDs, replace `.uuid()` with `.min(1)` or a suitable regex. */

export const idParamSchema = z.object({
  id: z.string().uuid()
});

export const contactIdParamSchema = z.object({
  contactId: z.string().uuid()
});

export const insuranceIdParamSchema = z.object({
  insuranceId: z.string().uuid()
});

export const consentIdParamSchema = z.object({
  consentId: z.string().uuid()
});
