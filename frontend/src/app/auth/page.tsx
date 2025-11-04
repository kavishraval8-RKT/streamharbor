"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SmartAuthPage() {
  const [step, setStep] = useState<'email' | 'login' | 'register'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get callback URL safely - normalize to prevent encoding issues
  const getCallbackUrl = () => {
    const raw = searchParams.get('callbackUrl');
    if (!raw) return '/';
    
    // If it's already a clean path, use it
    if (raw.startsWith('/') && !raw.includes('%')) {
      return raw;
    }
    
    // Otherwise try to decode once
    try {
      const decoded = decodeURIComponent(raw);
      return decoded.startsWith('/') ? decoded : '/';
    } catch {
      return '/';
    }
  };
  
  const callbackUrl = getCallbackUrl();

  // If already authenticated, leave this page immediately
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include', cache: 'no-store' });
        if (!cancelled && res.ok) {
          window.location.replace(callbackUrl || '/');
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [callbackUrl]);

  async function checkEmail() {
    setError('');
    setLoading(true);
    console.log('📧 Checking email:', email);
    try {
      const res = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      console.log('📡 Check-user response status:', res.status);
      const data = await res.json();
      console.log('📋 Check-user data:', data);
      if (!res.ok) throw new Error(data?.error || 'Failed to check user');
      setStep(data.exists ? 'login' : 'register');
      console.log('✓ Moving to step:', data.exists ? 'login' : 'register');
    } catch (e: any) {
      console.error('❌ Check email error:', e);
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function doLogin() {
    setError('');
    setLoading(true);
    try {
      console.log('🔐 Attempting login for:', email);
      console.log('📍 Will redirect to:', callbackUrl);
      
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      console.log('📡 Login response status:', res.status);
      console.log('📡 Set-Cookie header:', res.headers.get('set-cookie'));
      console.log('📡 All response headers:', Array.from(res.headers.entries()));
      
      if (res.status === 403) {
        console.log('⏳ Redirecting to pending approval page');
        window.location.href = '/pending-approval';
        return;
      }
      
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        console.log('❌ Login failed:', data?.error);
        throw new Error(data?.error || 'Login failed');
      }
      
      console.log('✅ Login successful! Token received, redirecting to:', callbackUrl);
      console.log('🍪 Cookie should now be set by server');

      // Probe the session to ensure the cookie is attached by the browser
      try {
        const probe = await fetch('/api/auth/me', { method: 'GET', credentials: 'include', cache: 'no-store' });
        console.log('🧪 /api/auth/me status after login:', probe.status);
        if (!probe.ok) {
          console.log('⌛ Waiting a bit longer for cookie to persist...');
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (err) {
        console.log('🧪 Probe error:', err);
      }

      // For fetch-based login, keep as a fallback path
      console.log('🔄 Navigating to:', callbackUrl);
      window.location.replace(callbackUrl);
    } catch (e: any) {
      console.error('Login error:', e);
      setError(e.message || 'Error');
      setLoading(false);
    }
  }

  async function doRegister() {
    setError('');
    setLoading(true);
    try {
      // Step 1: Create the account
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Register failed');
      
      // Step 2: Automatically log them in
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      if (!loginRes.ok) {
        throw new Error('Registration successful but login failed. Please sign in.');
      }
      
      // Step 3: Redirect to pending approval (they now have auth cookie)
      window.location.href = '/pending-approval';
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black via-black/80 to-transparent">
        <div className="px-12 py-4">
          <div className="text-red-600 font-bold text-3xl tracking-wide">
            StreamHarbor
          </div>
        </div>
      </header>
      <main className="min-h-screen flex items-center justify-center bg-[#141414] px-4 pt-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome</h1>
            <p className="text-gray-400">Sign in or create an account</p>
          </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded mb-6 text-center">
            {error}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={(e) => { e.preventDefault(); if (email && !loading) checkEmail(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="you@example.com"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className={`w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'login' && (
          // Use a classic form POST directly to the API so the server can set the cookie and redirect.
          <form method="POST" action={`/api/auth/login?callbackUrl=${encodeURIComponent(callbackUrl || '/')}`} className="space-y-4">
            <input type="hidden" name="email" value={email} />
            <div className="text-gray-400 text-sm">Signing in as {email}</div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••••"
                autoFocus
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !password}
                className={`flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => setStep('register')}
                className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-md"
              >
                Create account
              </button>
            </div>
          </form>
        )}

        {step === 'register' && (
          <form onSubmit={(e) => { e.preventDefault(); if (password && !loading) doRegister(); }} className="space-y-4">
            <div className="text-gray-400 text-sm">Create an account for {email}</div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="••••••••"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !password}
                className={`flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Creating…' : 'Create account'}
              </button>
              <button
                type="button"
                onClick={() => setStep('login')}
                className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-md"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
    </>
  );
}
