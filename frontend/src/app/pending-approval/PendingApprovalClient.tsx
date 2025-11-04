"use client";

import { useState } from 'react';

export default function PendingApprovalClient() {
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      // Call the check-user API to refresh the token if approved
      const res = await fetch('/api/auth/check-user');
      const data = await res.json();
      
      if (data.isApproved) {
        // User is now approved, redirect to home
        window.location.href = '/';
      } else {
        alert('Your account is still pending approval. Please check back later.');
      }
    } catch (error) {
      alert('Error checking status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth';
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#141414] px-4">
      <div className="max-w-lg text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h1 className="text-4xl font-bold text-white">Account Pending Approval</h1>
        
        <p className="text-lg text-gray-300">
          Thanks for signing up! Your account is currently awaiting approval by an administrator.
        </p>
        
        <p className="text-gray-400">
          You'll receive access to StreamHarbor once your account has been reviewed and approved. This usually takes a few minutes to a few hours.
        </p>

        <div className="pt-6 flex gap-4 justify-center">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? 'Checking...' : 'Check Status'}
          </button>
          
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}
