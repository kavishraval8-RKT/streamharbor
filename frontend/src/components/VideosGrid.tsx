'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Video = {
  id: string | number;
  title: string;
  description?: string;
  thumbnail_url?: string | null;
  hls_playlist_url?: string | null;
  raw_url?: string | null;
  status: 'PROCESSING' | 'PUBLISHED' | 'ERROR';
  processing_error?: string | null;
  created_at?: string;
};

export default function VideosGrid({ initialVideos }: { initialVideos: Video[] }) {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState<Video[]>(initialVideos || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If server-side didn't return videos (empty), fetch client-side on mount.
  useEffect(() => {
    let mounted = true;
    const fetchVideos = async () => {
      // don't refetch if we already have items
      if (videos && videos.length > 0) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('http://localhost:8080/api/videos');
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const json = await res.json();
        if (!mounted) return;
        setVideos(json);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Error fetching videos');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchVideos();

    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter((v) => (v.title || '').toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q));
  }, [videos, query]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <input
          aria-label="Search videos"
          placeholder="Search by title or description"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-md rounded-md border px-3 py-2 mr-4"
        />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const res = await fetch('http://localhost:8080/api/videos');
              if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
              const json = await res.json();
              setVideos(json);
            } catch (e: any) {
              setError(e?.message || 'Error fetching videos');
            } finally {
              setLoading(false);
            }
          }} className="text-sm bg-gray-100 px-3 py-2 rounded-md">Refresh</button>
          <Link href="/upload" className="text-sm bg-blue-600 text-white px-3 py-2 rounded-md">Upload</Link>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-600 mb-3">Loading videos...</div>}
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <p className="text-gray-500 col-span-3">No videos found.</p>
        ) : (
          filtered.map((video) => (
            <Link
              href={`/watch/${video.id}`}
              key={video.id}
              className="border rounded-lg shadow-lg overflow-hidden block hover:shadow-xl transition-shadow relative"
            >
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center relative">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} className="object-cover w-full h-full" />
                ) : (
                  <div className="text-gray-500">No thumbnail</div>
                )}

                {video.status === 'PROCESSING' && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="text-white font-medium">⏳ Processing</div>
                  </div>
                )}

                {/* Quick delete (admin/dev): stop click propagation to avoid navigation */}
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!confirm(`Delete video "${video.title}"? This cannot be undone.`)) return;
                    try {
                      const res = await fetch(`/api/videos/${video.id}`, { method: 'DELETE' });
                      if (!res.ok) throw new Error('Failed to delete');
                      // Remove from local state
                      setVideos((prev) => prev.filter((v) => v.id !== video.id));
                    } catch (err) {
                      alert('Delete failed');
                    }
                  }}
                  className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 text-white text-xs px-2 py-1 rounded shadow"
                >
                  Delete
                </button>

              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold truncate flex-1">{video.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    video.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                    video.status === 'ERROR' ? 'bg-red-100 text-red-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {video.status === 'PROCESSING' ? '⏳ Processing' :
                     video.status === 'ERROR' ? '❌ Error' :
                     '✓ Ready'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{video.description || 'No description.'}</p>
                {video.status === 'ERROR' && video.processing_error && (
                  <p className="text-sm text-red-600">Error: {video.processing_error}</p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
