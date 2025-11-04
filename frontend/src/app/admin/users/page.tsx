"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

type User = {
  id: string;
  email: string | null;
  name?: string | null;
  isApproved?: boolean;
  createdAt?: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load users');
      setUsers(data);
    } catch (e: any) {
      setError(e.message || 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const approveUser = async (id: string) => {
    if (!confirm('Approve this user?')) return;
    setApproving(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to approve');
      }
      await loadUsers();
    } catch (e: any) {
      alert(e.message || 'Error approving user');
    } finally {
      setApproving(null);
    }
  };

  const disapproveUser = async (id: string) => {
    if (!confirm('Revoke approval for this user? They will need to be approved again to access the site.')) return;
    setApproving(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve: false }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to disapprove');
      }
      await loadUsers();
    } catch (e: any) {
      alert(e.message || 'Error disapproving user');
    } finally {
      setApproving(null);
    }
  };

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Delete user "${email}"? This action cannot be undone.`)) return;
    setApproving(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || 'Failed to delete user');
      }
      await loadUsers();
    } catch (e: any) {
      alert(e.message || 'Error deleting user');
    } finally {
      setApproving(null);
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto max-w-6xl p-8 pt-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <Link href="/admin/dashboard" className="text-gray-300 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="text-gray-300">Loading users...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto max-w-6xl p-8 pt-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">User Management</h1>
          <Link href="/admin/dashboard" className="text-gray-300 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="text-red-400 bg-red-900/20 border border-red-700 rounded px-4 py-3">
          {error}
        </div>
      </main>
    );
  }

  const pendingUsers = users.filter(u => u.isApproved === false);
  const approvedUsers = users.filter(u => u.isApproved === true);

  return (
    <main className="container mx-auto max-w-6xl p-8 pt-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <Link href="/admin/dashboard" className="text-gray-300 hover:text-white text-sm">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Pending Users Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">
          Pending Approval ({pendingUsers.length})
        </h2>
        {pendingUsers.length === 0 ? (
          <div className="text-gray-400 bg-gray-800 rounded-lg px-4 py-8 text-center border border-gray-700">
            No pending users
          </div>
        ) : (
          <div className="space-y-2">
            {pendingUsers.map(user => (
              <div 
                key={user.id} 
                className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="text-white font-medium">{user.email}</div>
                  <div className="text-xs text-gray-400">
                    {user.name && <span className="mr-3">Name: {user.name}</span>}
                    <span>ID: {user.id}</span>
                    {user.createdAt && (
                      <span className="ml-3">
                        Registered: {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveUser(user.id)}
                    disabled={approving === user.id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {approving === user.id ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => deleteUser(user.id, user.email || 'Unknown')}
                    disabled={approving === user.id}
                    className="px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {approving === user.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Users Section */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">
          Approved Users ({approvedUsers.length})
        </h2>
        {approvedUsers.length === 0 ? (
          <div className="text-gray-400 bg-gray-800 rounded-lg px-4 py-8 text-center border border-gray-700">
            No approved users yet
          </div>
        ) : (
          <div className="overflow-x-auto bg-gray-800 rounded-lg border border-gray-700">
            <table className="w-full text-left">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-gray-300 font-medium text-sm">Email</th>
                  <th className="px-4 py-3 text-gray-300 font-medium text-sm">Name</th>
                  <th className="px-4 py-3 text-gray-300 font-medium text-sm">Status</th>
                  <th className="px-4 py-3 text-gray-300 font-medium text-sm">Registered</th>
                  <th className="px-4 py-3 text-gray-300 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvedUsers.map(user => (
                  <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="px-4 py-3 text-white">{user.email}</td>
                    <td className="px-4 py-3 text-gray-300">{user.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-700">
                        ✓ Approved
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => disapproveUser(user.id)}
                        disabled={approving === user.id}
                        className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {approving === user.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
