'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function SmartAuthHint() {
  const { user } = useAuth();
  if (user) return null;
  return (
    <div className="mx-auto max-w-3xl my-6">
      <div className="bg-black/40 border border-gray-800 rounded px-4 py-3 text-gray-300 text-sm">
        New here? <Link href="/auth" className="text-red-400 hover:text-red-300 underline">Create an account</Link> or <Link href="/login" className="text-red-400 hover:text-red-300 underline">sign in</Link> to personalize your experience.
      </div>
    </div>
  );
}
