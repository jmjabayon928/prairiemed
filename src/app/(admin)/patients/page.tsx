import PatientsListClient from './patients-client';

export const dynamic = 'force-dynamic'; // we rely on client fetching with credentials

export default function PatientsPage() {
  return <PatientsListClient />;
}
