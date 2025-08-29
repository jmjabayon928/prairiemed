// src/components/auth/RequireAuth.tsx
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';

export default async function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/signin');
  return <>{children}</>;
}