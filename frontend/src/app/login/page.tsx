"use client";

import { useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard';
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: 'admin@streamharbor.local',
    password: 'admin123'
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log('🔵 Form submitted, starting login...');
    console.log('🔵 Email:', formData.email);
    console.log('🔵 Callback URL:', callbackUrl);
    
    setIsLoading(true);
    setError('');

    try {
      console.log('🔵 Sending POST request to /api/auth/login');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      console.log('🔵 Response status:', response.status);
      console.log('🔵 Response headers:', Object.fromEntries(response.headers.entries()));

      let data;
      try {
        data = await response.json();
        console.log('🔵 Response data:', data);
      } catch (jsonErr) {
        console.error('🔴 Failed to parse JSON:', jsonErr);
        data = null;
      }

      if (response.ok) {
        console.log('✅ Login successful! Redirecting to:', callbackUrl);
        console.log('✅ About to redirect, timestamp:', Date.now());
        
        // Build absolute URL to ensure proper redirect (fixes localhost redirect issue)
        const baseUrl = window.location.origin.includes('localhost') 
          ? 'https://streamharbor.me' 
          : window.location.origin;
        const redirectUrl = callbackUrl.startsWith('http') 
          ? callbackUrl 
          : `${baseUrl}${callbackUrl}`;
        
        // Use setTimeout to ensure the redirect happens after React's render cycle
        setTimeout(() => {
          console.log('✅ Executing redirect now to:', redirectUrl);
          window.location.href = redirectUrl;
        }, 100);
        
        // Don't set isLoading to false or run finally block
        return;
      } else {
        console.error('🔴 Login failed with status:', response.status);
        setError((data && data.error) || 'Authentication failed');
      }
    } catch (err) {
      console.error('🔴 Login error:', err);
      setError('An unexpected error occurred: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      // Only set loading to false if we didn't successfully login
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#141414] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">StreamHarbor Admin</h1>
          <p className="text-gray-400">Sign in to access admin features</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="admin@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}