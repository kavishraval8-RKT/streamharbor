'use client';

import type { ReactNode } from 'react';
import { AuthProviderClient } from '@/context/AuthContext';

interface Props {
  children: ReactNode;
}

// Keep a named export `AuthProvider` for compatibility with existing imports.
export function AuthProvider({ children }: Props) {
  return (
    <AuthProviderClient>{children}</AuthProviderClient>
  );
}

export default function Providers({ children }: Props) {
  return <AuthProvider>{children}</AuthProvider>;
}