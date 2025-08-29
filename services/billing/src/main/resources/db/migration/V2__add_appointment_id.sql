ALTER TABLE billing.invoices ADD COLUMN IF NOT EXISTS appointment_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS ux_invoices_appointment_id
  ON billing.invoices(appointment_id);