"use client";

import { useState, useEffect } from 'react';
import VideoGrid from '@/components/VideoGrid';
import InfoModal from '@/components/InfoModal';
import dynamic from 'next/dynamic';

const SmartAuthHint = dynamic(() => import('./SmartAuthHint'), { ssr: false });

interface Video {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  status: 'PROCESSING' | 'PUBLISHED' | 'ERROR';
}

export default function BrowsePageClient() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Video | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch('/api/videos', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Failed to fetch videos');
        }
        const data = await res.json();
        setVideos(data);
      } catch (err: any) {
        console.error('Error fetching videos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const publishedVideos = videos.filter(v => v.status === 'PUBLISHED');

  const handleMoreInfo = (video: Video) => {
    setSelectedMovie(video);
  };

  const handleCloseModal = () => {
    setSelectedMovie(null);
  };

  return (
    <>
      <InfoModal video={selectedMovie} onClose={handleCloseModal} />
      
      <main className="min-h-screen pt-24 pb-16 px-4 bg-[#141414]">
        <div className="container mx-auto max-w-[2000px]">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-white">Movies</h1>
            <div className="flex items-center gap-4">
              <select 
                className="bg-transparent text-gray-300 border border-gray-700 rounded-md px-3 py-1 text-sm focus:border-gray-500 focus:outline-none"
              >
                <option value="newest">Recently Added</option>
                <option value="alpha">Alphabetical</option>
              </select>
            </div>
          </div>
          <SmartAuthHint />
          
          {loading ? (
          <div className="text-center py-32">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            <p className="text-gray-400 mt-4">Loading movies...</p>
          </div>
        ) : error ? (
          <div className="text-center py-32 bg-red-900/20 rounded-lg border border-red-700">
            <p className="text-red-400 text-lg font-medium">Error loading movies</p>
            <p className="text-gray-400 mt-2">{error}</p>
          </div>
        ) : publishedVideos.length === 0 ? (
          <div className="text-center py-32 bg-gray-900/50 rounded-lg">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <p className="text-gray-400 text-lg font-medium">No movies available yet</p>
            <p className="text-gray-500 mt-2">Check back soon!</p>
          </div>
        ) : (
          <VideoGrid videos={publishedVideos} onMoreInfo={handleMoreInfo} />
        )}
      </div>
    </main>
    </>
  );
}
