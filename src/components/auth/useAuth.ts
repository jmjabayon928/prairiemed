// src/lib/auth/useAuth.ts
'use client';
import { useAuthContext } from '@/components/auth/AuthContext';
export function useAuth() { return useAuthContext(); }