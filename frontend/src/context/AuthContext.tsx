'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type User = { email?: string; name?: string; role?: string } | null;

interface AuthContextValue {
  user: User;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProviderClient({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setUser(json.user ?? null);
      } else {
        // 401 is expected when not logged in, don't log it
        setUser(null);
      }
    } catch (err) {
      // Only log actual errors, not expected 401s
      if (err instanceof Error && !err.message.includes('401')) {
        console.error('Auth fetch error:', err);
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Don't fetch auth on public pages to avoid blocking
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/auth' || path === '/pending-approval') {
        setIsLoading(false);
        return;
      }
    }
    // fetch once on mount
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, refresh: fetchMe }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProviderClient');
  return ctx;
}
