CREATE SCHEMA IF NOT EXISTS billing;
CREATE TABLE IF NOT EXISTS billing.invoices (
  invoice_id UUID PRIMARY KEY,
  patient_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'open', 'paid', 'void', 'cancelled')
  ),
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS billing.invoice_items (
  invoice_item_id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES billing.invoices(invoice_id) ON DELETE CASCADE,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS billing.payments (
  payment_id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES billing.invoices(invoice_id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON billing.invoices (patient_id, created_at DESC);