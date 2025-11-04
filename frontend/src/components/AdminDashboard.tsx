'use client';

import { useEffect, useState } from 'react';

type Video = {
  id: number | string;
  title: string;
  status: string;
  created_at?: string;
  thumbnail_url?: string | null;
};

export default function AdminDashboard() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/videos');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setVideos(json);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDelete = async (id: string | number) => {
    if (!confirm('Delete this video and its files? This cannot be undone.')) return;
    try {
      const res = await fetch(`http://localhost:8080/api/videos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      // optimistic remove
      setVideos((v) => v.filter((x) => String(x.id) !== String(id)));
    } catch (e: any) {
      alert(e.message || 'Error deleting');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl mb-4">Admin Dashboard</h2>
      {error && <div className="text-red-600">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-2">
          {videos.length === 0 && <div>No videos found.</div>}
          {videos.map((v) => (
            <div key={v.id} className="flex items-center justify-between border p-3 rounded">
              <div>
                <div className="font-semibold">{v.title}</div>
                <div className="text-sm text-gray-600">{v.status} • {v.created_at}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(v.id)} className="text-sm text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
