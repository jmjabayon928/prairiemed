// src/components/AdminGate.tsx
import { redirect } from 'next/navigation';
import { getUser, type VerifiedUser } from '@/lib/auth/server';

function isAdmin(u: VerifiedUser | null): u is VerifiedUser {
  return !!u && Array.isArray(u.roles) && u.roles.includes('admin');
}

export default async function AdminGate({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!isAdmin(user)) redirect('/403');
  return <>{children}</>;
}
