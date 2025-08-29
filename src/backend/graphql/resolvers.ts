// src/backend/graphql/resolvers.ts
import type { Request } from 'express';
import { pool } from '../database/pool';
import { redis } from '../lib/redis';
import { emit } from '../events/kafka';

// Small helpers to keep toIsoString simple
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toIsoFromDate = (d: Date): string | null =>
  Number.isNaN(d.getTime()) ? null : d.toISOString();

const toIsoFromString = (s: string): string | null => {
  const t = s.trim();
  if (!t) return null;
  if (ISO_DATE_RE.test(t)) return t; // keep YYYY-MM-DD as-is
  return toIsoFromDate(new Date(t));
};

const toIsoFromNumber = (n: number): string | null => {
  const ms = n < 1e12 ? n * 1000 : n; // treat small values as epoch seconds
  return toIsoFromDate(new Date(ms));
};

const isIsoLike = (v: unknown): v is { toISOString(): string } =>
  typeof v === 'object' &&
  v !== null &&
  'toISOString' in v && // ← no cast needed here
  typeof (v as { toISOString: unknown }).toISOString === 'function';

/* ---------------------------- Config / Helpers ---------------------------- */

type Ctx = { req: Request };

const PUBLIC_READ = process.env.GQL_PUBLIC_READ === '1';
const PATIENTS_TTL_SECONDS = 60;

// default 30 minutes for end time if not provided
const APPT_DEFAULT_DURATION_MIN =
  Number(process.env.APPT_DEFAULT_DURATION_MIN ?? '30') || 30;

// Spring Billing base URL (support either env name)
const BILLING_BASE =
  process.env.BILLING_BASE ??
  process.env.BILLING_URL ??
  'http://localhost:8081';

function ensureCanRead(req: Request): void {
  if (PUBLIC_READ) return;
  const auth = req.headers.authorization ?? '';
  if (!auth.startsWith('Bearer ')) throw new Error('Forbidden');
}

export function toIsoString(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return toIsoFromDate(v);
  if (typeof v === 'string') return toIsoFromString(v);
  if (typeof v === 'number') return toIsoFromNumber(v);
  if (isIsoLike(v)) {
    try {
      const iso = v.toISOString();
      return typeof iso === 'string' ? iso : null;
    } catch {
      return null;
    }
  }
  return null;
}

/* --------------------------------- Types --------------------------------- */

// Typed as string to avoid `any` casts when checking membership
const ALLOWED_APPT_STATUS: Set<string> = new Set([
  'scheduled',
  'cancelled',
  'completed',
  'no_show',
]);

type DbPatientRow = {
  patient_id: string;
  mrn: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null; // DATE as 'YYYY-MM-DD'
  sex_at_birth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province_state: string | null;
  postal_code: string | null;
  status: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

type DbApptRow = {
  appointment_id: string;
  patient_id: string;
  scheduled_start: Date | string;
  scheduled_end: Date | string | null;
  status: string;
  notes: string | null;
};

// Expected shape from Spring Billing REST
type BillingSummaryDTO = {
  patientId: string;
  outstandingBalance: number | string;
  lastInvoiceDate?: string | null;
  invoices: Array<{
    id: string;
    status: string;
    totalAmount: number | string;
    currency?: string;
    createdAt: string;
  }>;
};

function mapPatient(r: DbPatientRow) {
  return {
    id: r.patient_id,
    mrn: r.mrn,
    firstName: r.first_name,
    lastName: r.last_name,
    dateOfBirth: r.date_of_birth,
    sexAtBirth: r.sex_at_birth,
    phone: r.phone,
    email: r.email,
    address: r.address,
    city: r.city,
    provinceState: r.province_state,
    postalCode: r.postal_code,
    status: r.status,
    createdAt: toIsoString(r.created_at),
    updatedAt: toIsoString(r.updated_at),
  };
}

function mapAppointment(r: DbApptRow) {
  return {
    id: r.appointment_id,
    patientId: r.patient_id,
    // GraphQL field `date` maps to scheduled_start
    date: toIsoString(r.scheduled_start),
    // GraphQL field `reason` maps to notes
    reason: r.notes,
    status: r.status,
    // (optional) if you later expose start/end explicitly:
    // scheduledStart: toIsoString(r.scheduled_start),
    // scheduledEnd: toIsoString(r.scheduled_end),
  };
}

/* -------------------------------- Resolvers ------------------------------- */

export const resolvers = {
  Query: {
    patients: async (
      _parent: unknown,
      args: { q?: string; limit?: number; offset?: number },
      ctx: Ctx
    ) => {
      ensureCanRead(ctx.req);

      const q = (args.q ?? '').trim();
      const limit = Math.max(0, Math.min(args.limit ?? 20, 50));
      const offset = Math.max(0, args.offset ?? 0);

      const cacheKey = `gql:patients:${q}:${limit}:${offset}`;
      try {
        if (redis) {
          const hit = await redis.get(cacheKey);
          if (hit) return JSON.parse(hit) as ReturnType<typeof mapPatient>[];
        }
      } catch {
        /* ignore cache errors */
      }

      const params: Array<string | number> = [];
      let where = '';
      if (q) {
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        where =
          'WHERE (mrn ILIKE $1 OR first_name ILIKE $2 OR last_name ILIKE $3)';
      }
      params.push(limit, offset);

      const { rows } = await pool.query<DbPatientRow>(
        `
        SELECT patient_id, mrn, first_name, last_name, date_of_birth,
               sex_at_birth, phone, email, address, city, province_state,
               postal_code, status, created_at, updated_at
        FROM patients
        ${where}
        ORDER BY created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
        `,
        params
      );

      const mapped = rows.map(mapPatient);

      try {
        if (redis) {
          await redis.set(
            cacheKey,
            JSON.stringify(mapped),
            'EX',
            PATIENTS_TTL_SECONDS
          );
        }
      } catch {
        /* ignore cache errors */
      }

      return mapped;
    },

    patient: async (_: unknown, args: { id: string }, ctx: Ctx) => {
      ensureCanRead(ctx.req);
      const { rows } = await pool.query<DbPatientRow>(
        `
        SELECT patient_id, mrn, first_name, last_name, date_of_birth,
               sex_at_birth, phone, email, address, city, province_state,
               postal_code, status, created_at, updated_at
        FROM patients
        WHERE patient_id = $1
        `,
        [args.id]
      );
      const [row] = rows;
      if (!row) return null;
      return mapPatient(row);
    },

    appointments: async (
      _parent: unknown,
      args: { patientId: string; limit?: number; offset?: number },
      ctx: Ctx
    ) => {
      ensureCanRead(ctx.req);

      const limit = Math.max(0, Math.min(args.limit ?? 20, 100));
      const offset = Math.max(0, args.offset ?? 0);

      const { rows } = await pool.query<DbApptRow>(
        `
        SELECT appointment_id, patient_id, scheduled_start, scheduled_end, notes, status
        FROM appointments
        WHERE patient_id = $1
        ORDER BY scheduled_start DESC
        LIMIT $2 OFFSET $3
        `,
        [args.patientId, limit, offset]
      );

      return rows.map(mapAppointment);
    },
  },

  Mutation: {
    createAppointment: async (
      _parent: unknown,
      args: {
        patientId: string;
        date: string;
        reason?: string | null;
        status?: string | null;
      }
    ) => {
      // JS-side validation (nice errors for callers)
      const statusInput = (args.status ?? 'scheduled').trim().toLowerCase();
      if (!ALLOWED_APPT_STATUS.has(statusInput)) {
        throw new Error(
          `Invalid status "${args.status ?? ''}". Allowed: ${Array.from(
            ALLOWED_APPT_STATUS
          ).join(', ')}`
        );
      }

      // Validate & normalize date (also avoids timezone surprises)
      const start = new Date(args.date);
      if (Number.isNaN(start.getTime())) throw new Error('Invalid date');
      const startIso = start.toISOString();

      // SQL-side normalization (final authority): lower + trim + default 'scheduled'
      const { rows } = await pool.query<DbApptRow>(
        `
        INSERT INTO appointments (
          patient_id, scheduled_start, scheduled_end, notes, status, created_at, updated_at
        )
        VALUES (
          $1,
          $2::timestamptz,
          ($2::timestamptz + ($3 || ' minutes')::interval),
          $4,
          CASE
            WHEN $5::text IS NULL OR length(btrim($5::text)) = 0
              THEN 'scheduled'
            ELSE lower(btrim($5::text))
          END,
          now(),
          now()
        )
        RETURNING appointment_id, patient_id, scheduled_start, scheduled_end, notes, status
        `,
        [args.patientId, startIso, APPT_DEFAULT_DURATION_MIN, args.reason ?? null, statusInput]
      );

      // Safely pull the inserted row
      const [inserted] = rows;
      if (!inserted) {
        throw new Error('Failed to insert appointment');
      }

      const appt = mapAppointment(inserted);

      // Kafka (fire-and-forget) via our emit helper
      try {
        await emit('appointment.created', {
          id: appt.id,
          patientId: appt.patientId,
          scheduledStart: appt.date,
          scheduledEnd: toIsoString(inserted.scheduled_end),
          reason: appt.reason,
          status: appt.status,
          ts: Date.now(),
        });
      } catch (e) {
        console.warn('[Kafka] produce failed:', (e as Error).message);
      }

      // Optional cache eviction
      try {
        if (redis) {
          const keys = await redis.keys('gql:patients:*');
          if (keys.length) await redis.del(keys);
        }
      } catch {
        /* ignore */
      }

      return appt;
    },

    cancelAppointment: async (_: unknown, args: { id: string }) => {
      const res = await pool.query(
        `
        UPDATE appointments
        SET status = 'cancelled', updated_at = now()
        WHERE appointment_id = $1
        `,
        [args.id]
      );
      return (res.rowCount ?? 0) > 0;
    },
  },

  Patient: {
    appointments: async (
      parent: { id: string },
      args: { limit?: number; offset?: number }
    ) => {
      const limit = Math.max(0, Math.min(args.limit ?? 20, 100));
      const offset = Math.max(0, args.offset ?? 0);

      const { rows } = await pool.query<DbApptRow>(
        `
        SELECT appointment_id, patient_id, scheduled_start, scheduled_end, notes, status
        FROM appointments
        WHERE patient_id = $1
        ORDER BY scheduled_start DESC
        LIMIT $2 OFFSET $3
        `,
        [parent.id, limit, offset]
      );

      return rows.map(mapAppointment);
    },

    // billingSummary resolver (JWT forwarded to Spring)
    billingSummary: async (
      parent: { id: string },
      _args: unknown,
      ctx: { req: Request }
    ) => {
      const auth = ctx.req.headers.authorization ?? null; // forward caller's JWT if present
      const url = `${BILLING_BASE}/api/billing/patients/${parent.id}/summary`;

      // Build init without `undefined` (exactOptionalPropertyTypes-friendly)
      const init: RequestInit = {
        ...(auth ? { headers: { Authorization: auth } as HeadersInit } : {}),
      };

      const res = await fetch(url, init);

      if (!res.ok) {
        throw new Error(`Billing service error: ${res.status}`);
      }

      const data = (await res.json()) as BillingSummaryDTO;

      return {
        patientId: data.patientId,
        outstandingBalance: Number(data.outstandingBalance ?? 0),
        lastInvoiceDate: data.lastInvoiceDate ?? null,
        invoices: (data.invoices ?? []).map((i) => ({
          id: i.id,
          status: i.status,
          totalAmount: Number(i.totalAmount ?? 0),
          currency: i.currency ?? 'USD',
          createdAt: i.createdAt,
        })),
      };
    },
  },
};
