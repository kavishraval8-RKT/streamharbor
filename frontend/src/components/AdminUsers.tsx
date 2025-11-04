"use client";

import { useEffect, useState } from 'react';

type User = {
  id: string;
  email: string | null;
  name?: string | null;
  isApproved?: boolean;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load users');
      setUsers(data);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    if (!confirm('Approve this user?')) return;
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve: true }),
    });
    if (res.ok) load();
  };

  if (loading) return <div className="text-gray-300">Loading users…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  const pending = users.filter(u => u.isApproved === false);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-3">User Approvals</h2>
      {pending.length === 0 ? (
        <div className="text-gray-400">No pending users.</div>
      ) : (
        <div className="space-y-2">
          {pending.map(u => (
            <div key={u.id} className="flex items-center justify-between border border-gray-800 rounded px-4 py-3 bg-black/30">
              <div>
                <div className="text-white">{u.email}</div>
                <div className="text-xs text-gray-400">ID: {u.id}</div>
              </div>
              <button onClick={() => approve(u.id)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm">Approve</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
