import AdminDashboard from '@/components/AdminDashboard';
import Link from 'next/link';
import { requireAdmin } from '@/lib/serverAuth';

export default async function Page() {
  // Ensure user is admin
  await requireAdmin();
  
  return (
    <main className="container mx-auto max-w-4xl p-8 pt-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <Link 
          href="/admin/users"
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          👥 Manage Users
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link 
          href="/admin/users"
          className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:bg-gray-900/70 transition-colors"
        >
          <div className="text-gray-400 text-sm mb-1">User Management</div>
          <div className="text-white text-2xl font-bold">Approve Users</div>
        </Link>
        <Link 
          href="/upload"
          className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 hover:bg-gray-900/70 transition-colors"
        >
          <div className="text-gray-400 text-sm mb-1">Upload</div>
          <div className="text-white text-2xl font-bold">Add Videos</div>
        </Link>
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-1">Content</div>
          <div className="text-white text-2xl font-bold">Video Library</div>
        </div>
      </div>

      <AdminDashboard />
    </main>
  );
}
