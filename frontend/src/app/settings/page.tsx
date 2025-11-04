"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProfileData {
  id: string;
  username: string | null;
  bio: string | null;
  userId: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [session, setSession] = useState<{ user?: { name?: string | null; email?: string | null } } | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bootstrap auth state from our JWT-based endpoint
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.status === 401) {
          if (!cancelled) setStatus('unauthenticated');
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setSession({ user: { name: data?.user?.name ?? null, email: data?.user?.email ?? null } });
          setStatus('authenticated');
        }
      } catch (e) {
        if (!cancelled) setStatus('unauthenticated');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Fetch profile data on mount after auth
  useEffect(() => {
    async function fetchProfile() {
      if (status !== 'authenticated') return;

      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to fetch profile');
        
        const data = await res.json();
        setProfile(data);
        setUsername(data.username || '');
        setBio(data.bio || '');
      } catch (error) {
        console.error('Error fetching profile:', error);
        setMessage({ type: 'error', text: 'Failed to load profile' });
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, bio }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setProfile(data);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-[#141414] pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2 font-montserrat">Profile Settings</h1>
          <p className="text-gray-400">Manage your account information</p>
        </div>

        {/* Profile Form */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800 p-8">
          {/* User Info */}
          <div className="mb-6 pb-6 border-b border-gray-800">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white text-2xl font-bold">
                {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-white font-semibold text-lg">{session?.user?.name}</p>
                <p className="text-gray-400 text-sm">{session?.user?.email}</p>
              </div>
            </div>
          </div>

          {/* Message Alert */}
          {message && (
            <div 
              className={`mb-6 p-4 rounded-lg border ${
                message.type === 'success' 
                  ? 'bg-green-900/20 border-green-700 text-green-400' 
                  : 'bg-red-900/20 border-red-700 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 
                         focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent
                         placeholder-gray-500 transition-all"
                disabled={submitting}
              />
              <p className="text-gray-500 text-xs mt-1">
                Must be at least 3 characters. Leave empty to remove.
              </p>
            </div>

            {/* Bio Field */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 
                         focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent
                         placeholder-gray-500 transition-all resize-none"
                disabled={submitting}
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                         focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 
                         focus:ring-offset-gray-900"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href="/"
                className="text-gray-400 hover:text-white transition-colors px-4 py-3"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Profile Data Debug (Optional - Remove in production) */}
        {profile && (
          <div className="mt-8 bg-gray-900/30 rounded-lg border border-gray-800 p-4">
            <p className="text-gray-400 text-sm font-mono">
              Profile ID: {profile.id}
            </p>
            <p className="text-gray-400 text-sm font-mono">
              User ID: {profile.userId}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
