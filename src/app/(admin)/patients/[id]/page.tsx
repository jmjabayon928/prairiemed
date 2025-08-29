// src/app/(admin)/patients/[id]/page.tsx
import PatientDetailClient from './patient-client';

export const dynamic = 'force-dynamic';

type PageProps = Readonly<{
  params: Readonly<{ id: string }>;
}>;

export default function PatientDetailPage({ params }: PageProps) {
  return <PatientDetailClient id={params.id} />;
}
