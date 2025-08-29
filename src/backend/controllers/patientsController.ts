// src/backend/controllers/patientsController.ts
import type { Response } from 'express';
import type { AuthedRequest } from '../types';

import {
  searchPatientsService,
  createPatientService,
  getPatientByIdService,
  updatePatientService,
  softDeletePatientService,
  listContactsService,
  addContactService,
  updateContactService,
  deleteContactService,
  listInsurancesService,
  addInsuranceService,
  updateInsuranceService,
  deleteInsuranceService,
  listConsentsService,
  addConsentService,
  updateConsentService,
  type Requester,
  ForbiddenError,
  NotFoundError,
} from '../services/patientsService';

import type {
  CreatePatientInput,
  UpdatePatientInput,
  AddContactInput,
  UpdateContactInput,
  AddInsuranceInput,
  UpdateInsuranceInput,
  AddConsentInput,
  UpdateConsentInput,
} from '../repositories/patientsRepo';

/** Build a Requester from AuthedRequest (defensive against undefined) */
function getRequester(req: AuthedRequest): Requester {
  return {
    userId: req.auth?.userId ?? 'unknown',
    roles: Array.isArray(req.auth?.roles) ? (req.auth!.roles as string[]) : [],
  };
}

/** Uniform error translation to HTTP */
function handleError(err: unknown, res: Response): Response {
  if (err instanceof ForbiddenError) {
    return res.status(403).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  // Optionally log the full error here
  return res.status(500).json({ error: 'Server error' });
}

/* ------------------------------- Patients ------------------------------- */

export async function searchPatientsHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const patients = await searchPatientsService(requester, q);
    return res.json({ patients });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function createPatientHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    // Body should already be validated by Zod middleware
    const body = req.body as CreatePatientInput;
    const patient = await createPatientService(requester, body);
    return res.status(201).json({ patient });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function getPatientByIdHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { id } = req.params as { id: string };
    const patient = await getPatientByIdService(requester, id);
    return res.json({ patient });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function updatePatientHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { id } = req.params as { id: string };
    const patch = req.body as UpdatePatientInput;
    const patient = await updatePatientService(requester, id, patch);
    return res.json({ patient });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function softDeletePatientHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { id } = req.params as { id: string };
    const patient = await softDeletePatientService(requester, id);
    return res.json({ patient });
  } catch (e) {
    return handleError(e, res);
  }
}

/* ------------------------------- Contacts -------------------------------- */

export async function listContactsHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { id } = req.params as { id: string }; // patientId
    const contacts = await listContactsService(requester, id);
    return res.json({ contacts });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function addContactHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { id } = req.params as { id: string }; // patientId
    const input = req.body as AddContactInput;
    const contact = await addContactService(requester, id, input);
    return res.status(201).json({ contact });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function updateContactHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { contactId } = req.params as { contactId: string };
    const patch = req.body as UpdateContactInput;
    const contact = await updateContactService(requester, contactId, patch);
    return res.json({ contact });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function deleteContactHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { contactId } = req.params as { contactId: string };
    const ok = await deleteContactService(requester, contactId);
    return res.json({ ok });
  } catch (e) {
    return handleError(e, res);
  }
}

/* ------------------------------ Insurance -------------------------------- */

export async function listInsurancesHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { id } = req.params as { id: string }; // patientId
    const insurances = await listInsurancesService(requester, id);
    return res.json({ insurances });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function addInsuranceHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { id } = req.params as { id: string }; // patientId
    const input = req.body as AddInsuranceInput;
    const insurance = await addInsuranceService(requester, id, input);
    return res.status(201).json({ insurance });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function updateInsuranceHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { insuranceId } = req.params as { insuranceId: string };
    const patch = req.body as UpdateInsuranceInput;
    const insurance = await updateInsuranceService(requester, insuranceId, patch);
    return res.json({ insurance });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function deleteInsuranceHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { insuranceId } = req.params as { insuranceId: string };
    const ok = await deleteInsuranceService(requester, insuranceId);
    return res.json({ ok });
  } catch (e) {
    return handleError(e, res);
  }
}

/* -------------------------------- Consents ------------------------------- */

export async function listConsentsHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { id } = req.params as { id: string }; // patientId
    const consents = await listConsentsService(requester, id);
    return res.json({ consents });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function addConsentHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { id } = req.params as { id: string }; // patientId
    const input = req.body as AddConsentInput;
    const consent = await addConsentService(requester, id, input);
    return res.status(201).json({ consent });
  } catch (e) {
    return handleError(e, res);
  }
}

export async function updateConsentHandler(req: AuthedRequest, res: Response) {
  try {
    const requester = getRequester(req);
    const { consentId } = req.params as { consentId: string };
    const patch = req.body as UpdateConsentInput;
    const consent = await updateConsentService(requester, consentId, patch);
    return res.json({ consent });
  } catch (e) {
    return handleError(e, res);
  }
}
