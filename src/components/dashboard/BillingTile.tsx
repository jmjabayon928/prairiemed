// src/components/dashboard/BillingTile.tsx
import { fetchPatientBillingSummary, type PatientBillingSummary } from "@/lib/billing";

type Props = Readonly<{
  patientId?: string;
}>;

export default async function BillingTile({ patientId }: Props) {
  const id = patientId ?? process.env.DEMO_PATIENT_ID ?? "";
  const summary: PatientBillingSummary | null = id
    ? await fetchPatientBillingSummary(id)
    : null;

  const totals = summary?.totals;
  const draftCount = totals?.draftCount ?? 0;
  const draftAmount = totals?.draftAmount ?? 0;
  const paidCount = totals?.paidCount ?? 0;
  const paidAmount = totals?.paidAmount ?? 0;
  const currency = totals?.currency ?? "CAD";

  return (
    <div className="rounded-2xl border p-5 shadow-sm bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Billing</h3>
        <span className="text-xs text-gray-500">Patient: {id || "—"}</span>
      </div>

      {!summary ? (
        <div className="mt-4 text-sm text-gray-500">
          No data {id ? "(check Spring Billing service)" : "(set DEMO_PATIENT_ID)"}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Kpi label="Draft Invoices" value={draftCount} sub={`${currency} ${fmt(draftAmount)}`} />
          <Kpi label="Paid Invoices" value={paidCount} sub={`${currency} ${fmt(paidAmount)}`} />
        </div>
      )}

      <div className="mt-4 text-right">
        {id && summary ? (
          <a
            href={`/patients/${encodeURIComponent(id)}/billing`}
            className="text-sm text-blue-600 hover:underline"
          >
            View details →
          </a>
        ) : (
          <span className="text-sm text-gray-400 select-none">View details →</span>
        )}
      </div>
    </div>
  );
}

function Kpi(props: Readonly<{ label: string; value: number | string; sub?: string }>) {
  const { label, value, sub } = props;
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

function fmt(n: number) {
  try {
    return new Intl.NumberFormat().format(n);
  } catch {
    return String(n);
  }
}
