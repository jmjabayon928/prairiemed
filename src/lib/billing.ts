// src/lib/billing.ts

// Allow Next.js fetch extensions while staying compatible with plain TS
type NextFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
};

export type Invoice = {
  id?: string;
  status?: string; // 'DRAFT' | 'SENT' | 'PAID' | etc.
  total?: number;
  currency?: string;
  createdAt?: string;
};

export type PatientBillingSummary = {
  patientId?: string;
  invoices?: Invoice[];
  totals?: {
    draftCount?: number;
    draftAmount?: number;
    sentCount?: number;
    paidCount?: number;
    paidAmount?: number;
    currency?: string;
  };
};

// Export friendly aliases used by UI components
export type BillingTotals = NonNullable<PatientBillingSummary["totals"]>;

const BILLING_BASE_URL =
  process.env.BILLING_BASE_URL ?? "http://localhost:8081";

export async function fetchPatientBillingSummary(
  patientId: string
): Promise<PatientBillingSummary | null> {
  const url = `${BILLING_BASE_URL}/api/billing/patients/${encodeURIComponent(
    patientId
  )}/summary`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);

  try {
    const init: NextFetchInit = {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
      next: { revalidate: 30 },
    };

    // Cast once to satisfy the global fetch signature
    const res = await fetch(url, init as unknown as RequestInit);

    if (!res.ok) {
      console.error(
        "Billing summary fetch failed:",
        res.status,
        res.statusText
      );
      return null;
    }

    const data: unknown = await res.json();
    // Use the exported normalizer that applies safe defaults
    return normalizeBillingSummary(data);
  } catch (err) {
    // AbortError or network error
    console.error("Billing summary fetch error:", err);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/* ----------------- helpers (no any) ----------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(
  obj: Record<string, unknown>,
  key: string
): string | undefined {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function getNumber(
  obj: Record<string, unknown>,
  key: string
): number | undefined {
  const v = obj[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function toInvoice(value: unknown): Invoice | undefined {
  if (!isRecord(value)) return undefined;

  const id = getString(value, "id");
  const status = getString(value, "status");
  const total = getNumber(value, "total");
  const currency = getString(value, "currency");
  const createdAt = getString(value, "createdAt");

  // With exactOptionalPropertyTypes, include a field only if defined.
  const out: Invoice = {
    ...(id !== undefined ? { id } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(total !== undefined ? { total } : {}),
    ...(currency !== undefined ? { currency } : {}),
    ...(createdAt !== undefined ? { createdAt } : {}),
  };
  return out;
}

function toInvoiceArray(value: unknown): Invoice[] {
  if (!Array.isArray(value)) return [];
  const out: Invoice[] = [];
  for (const v of value) {
    const inv = toInvoice(v);
    if (inv) out.push(inv);
  }
  return out;
}

type Totals = NonNullable<PatientBillingSummary["totals"]>;

function toTotals(value: unknown): Totals | undefined {
  if (!isRecord(value)) return undefined;

  const draftCount = getNumber(value, "draftCount");
  const draftAmount = getNumber(value, "draftAmount");
  const sentCount = getNumber(value, "sentCount");
  const paidCount = getNumber(value, "paidCount");
  const paidAmount = getNumber(value, "paidAmount");
  const currency = getString(value, "currency");

  const totals: Totals = {
    ...(draftCount !== undefined ? { draftCount } : {}),
    ...(draftAmount !== undefined ? { draftAmount } : {}),
    ...(sentCount !== undefined ? { sentCount } : {}),
    ...(paidCount !== undefined ? { paidCount } : {}),
    ...(paidAmount !== undefined ? { paidAmount } : {}),
    ...(currency !== undefined ? { currency } : {}),
  };
  return totals;
}

function deriveTotals(invoices: Invoice[]): Totals {
  let draftCount = 0,
    draftAmount = 0,
    sentCount = 0,
    paidCount = 0,
    paidAmount = 0;
  let currency: string | undefined;

  for (const inv of invoices) {
    if (!currency && inv.currency) currency = inv.currency;
    const amt = typeof inv.total === "number" ? inv.total : 0;
    const status = (inv.status ?? "").toUpperCase();

    if (status === "DRAFT") {
      draftCount++;
      draftAmount += amt;
    } else if (status === "SENT") {
      sentCount++;
    } else if (status === "PAID") {
      paidCount++;
      paidAmount += amt;
    }
  }

  const totals: Totals = {
    draftCount,
    draftAmount,
    sentCount,
    paidCount,
    paidAmount,
    ...(currency !== undefined ? { currency } : {}),
  };
  return totals;
}

/**
 * Internal normalizer that maps unknown REST payloads into the project shape.
 * Does not force defaults; see `normalizeBillingSummary` for the exported
 * safe-default version.
 */
function normalizeSummary(data: unknown): PatientBillingSummary {
  if (!isRecord(data)) {
    return { patientId: "", invoices: [], totals: {} };
  }

  // patientId may live at root.patientId or root.patient.id
  const directPatientId = getString(data, "patientId");
  let nestedPatientId: string | undefined;

  // ✅ no cast needed; `data` is narrowed to Record<string, unknown>
  const patientField = data["patient"]; // CHANGED
  if (isRecord(patientField)) {
    nestedPatientId = getString(patientField, "id");
  }

  // ✅ pass unknown directly to helpers; they accept unknown
  const invoices = toInvoiceArray(data["invoices"]); // CHANGED
  const totals = toTotals(data["totals"]) ?? deriveTotals(invoices); // CHANGED

  return {
    patientId: directPatientId ?? nestedPatientId ?? "",
    invoices,
    totals,
  };
}

/* ----------------- exported strict normalizer (used by tests/UI) ----------------- */

/**
 * Exported normalizer that applies **safe defaults** so the UI/tests can
 * rely on concrete numbers/strings:
 *  - missing counts/amounts → 0
 *  - missing currency → "CAD"
 */
export function normalizeBillingSummary(input: unknown): PatientBillingSummary {
  const base = normalizeSummary(input);

  const totalsIn: BillingTotals | undefined = base.totals;
  const rec: Record<string, unknown> = isRecord(totalsIn) ? totalsIn : {};

  const coerceNumber = (v: unknown): number => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v.trim());
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };
  const coerceString = (v: unknown, fallback: string): string =>
    typeof v === "string" && v.length > 0 ? v : fallback;

  const totalsOut: BillingTotals = {
    draftCount: coerceNumber(rec["draftCount"]),
    draftAmount: coerceNumber(rec["draftAmount"]),
    sentCount: coerceNumber(rec["sentCount"]),
    paidCount: coerceNumber(rec["paidCount"]),
    paidAmount: coerceNumber(rec["paidAmount"]),
    currency: coerceString(rec["currency"], "CAD"),
  };

  return {
    patientId: base.patientId ?? "",
    invoices: Array.isArray(base.invoices) ? base.invoices : [],
    totals: totalsOut,
  };
}
