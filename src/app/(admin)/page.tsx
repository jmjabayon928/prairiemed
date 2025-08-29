// src/app/(admin)/page.tsx
// server component
import { getUser } from '@/lib/auth/server';
import BillingTile from '@/components/dashboard/BillingTile';

function AdminDashboard() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <BillingTile />
      {/* add other admin KPIs here */}
    </div>
  );
}

function ClinicianDashboard() { return <div>Clinician worklist…</div>; }

function FinanceDashboard() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <BillingTile />
      {/* add finance metrics here */}
    </div>
  );
}

function DefaultDashboard() { return <div>Welcome to PrairieMed</div>; }

export default async function Home() {
  const user = await getUser();           // RequireAuth guarantees non-null
  const roles = user?.roles ?? [];

  if (roles.includes('admin')) return <AdminDashboard />;
  if (roles.some(r => ['Physician', 'Nurse'].includes(r))) return <ClinicianDashboard />;
  if (roles.some(r => ['Billing', 'Finance'].includes(r))) return <FinanceDashboard />;
  return <DefaultDashboard />;
}
