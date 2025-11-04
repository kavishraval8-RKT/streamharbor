'use client';

import { useEffect, useMemo, useState } from 'react';
import NetflixStylePlayer from '@/components/NetflixStylePlayer';

type Video = {
  id: number | string;
  title: string;
  description?: string;
  thumbnail_url?: string | null;
  hls_playlist_url?: string | null;
  raw_url?: string | null;
  status?: 'PROCESSING' | 'PUBLISHED' | 'ERROR';
  processing_error?: string | null;
  processing_progress?: number | null;
  created_at?: string;
};

export default function WatchPlayer({ video }: { video: Video }) {
  const [current, setCurrent] = useState<Video>(video);

  // Poll for updates while processing
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/videos/${video.id}`);
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setCurrent(json);
      } catch (e) {
        // ignore
      }
    };

    const interval = setInterval(() => {
      if (current.status === 'PROCESSING') poll();
    }, 3000);

    // Also run an immediate poll
    if (current.status === 'PROCESSING') poll();

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [video.id, current.status]);

  const src = current.hls_playlist_url || current.raw_url || 'http://vjs.zencdn.net/v/oceans.mp4';

  // Estimated processing time heuristic (not precise)
  const estimated = useMemo(() => {
    if (!current.created_at) return null;
    const created = new Date(current.created_at).getTime();
    const elapsed = Math.max(0, Math.floor((Date.now() - created) / 1000));
    const guessedTotal = 15; // seconds typical for small test files
    const remaining = Math.max(0, guessedTotal - elapsed);
    return { elapsed, remaining };
  }, [current.created_at, current.status]);

  return (
    <>
      <NetflixStylePlayer 
        key={current.status} 
        src={src} 
        poster={current.thumbnail_url || undefined} 
        title={current.title} 
        videoId={current.id}
      />

      {current.status === 'PROCESSING' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none bg-black z-50">
          <div className="bg-gray-900/95 rounded-lg p-6 text-center shadow-2xl border border-gray-700 max-w-md">
            <div className="mb-4">
              <div className="inline-block p-3 bg-red-600/20 rounded-full mb-3">
                <svg className="w-12 h-12 text-red-600 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Processing Your Video</h3>
              <p className="text-gray-400 text-sm">
                We're optimizing your video for the best streaming experience
              </p>
            </div>
            
            {/* Real progress if available */}
            {typeof current.processing_progress === 'number' ? (
              <div className="mt-4 w-80 max-w-full">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Processing</span>
                  <span>{Math.round(current.processing_progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-600 to-red-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(0, Math.min(100, Math.round(current.processing_progress)))}%` }}
                  />
                </div>
              </div>
            ) : estimated && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Time elapsed: {estimated.elapsed}s</span>
                  <span>~{estimated.remaining}s remaining</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-red-600 to-red-500 h-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${Math.min(100, (estimated.elapsed / (estimated.elapsed + estimated.remaining)) * 100)}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  💡 Tip: Large videos may take several minutes. You can navigate away and check back later!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {current.status === 'ERROR' && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none bg-black z-50">
          <div className="bg-red-900/80 backdrop-blur-sm text-red-100 rounded-lg p-6 border border-red-700 max-w-md">
            <div className="font-bold text-lg mb-2">⚠️ Processing Failed</div>
            {current.processing_error && <div className="text-sm">{current.processing_error}</div>}
          </div>
        </div>
      )}
    </>
  );
}