// src/types/index.ts

// Re-export core billing types from the source module
export type {
  Invoice,
  BillingTotals,
  PatientBillingSummary,
} from '@/lib/billing';

// Back-compat alias so existing imports keep working.
// Prefer importing PatientBillingSummary directly in new code.
export type BillingSummary = import('@/lib/billing').PatientBillingSummary;
