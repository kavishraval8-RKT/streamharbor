'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AuthNav() {
  const router = useRouter();
  const { user, isLoading, refresh } = useAuth();

  // While loading, show nothing (keeps layout stable). Adjust if you prefer a loader.
  if (isLoading) return null;

  return (
    <div className="flex items-center gap-4">
      {user?.role === 'admin' && (
        <>
          <Link href="/admin/dashboard" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
            Admin
          </Link>
          <Link href="/upload" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
            Upload
          </Link>
        </>
      )}
      {user ? (
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            await refresh();
            router.push('/');
          }}
          className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
        >
          Sign out
        </button>
      ) : (
        <Link href="/auth" prefetch={false} className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
          Sign in
        </Link>
      )}
    </div>
  );
}
