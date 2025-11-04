"use client";
import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import CarouselSkeleton from '../components/CarouselSkeleton';
import VideoDetailsModal from '../components/VideoDetailsModal';

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string | null;
  hls_playlist_url?: string | null;
  raw_url?: string | null;
  status: 'PROCESSING' | 'PUBLISHED' | 'ERROR';
  processing_error?: string | null;
}

function VideoCard({ video, onAdd, onMore, isInWatchlist }: { video: Video; onAdd: () => void; onMore: () => void; isInWatchlist?: boolean }) {
  if (video.status !== 'PUBLISHED') return null;
  return (
    <div className="flex-shrink-0 w-[16vw] min-w-[150px] max-w-[280px] group relative">
      {/* Main card wrapper with hover scale and z-index */}
      <div className="relative transform transition-transform duration-300 ease-in-out group-hover:scale-[1.2] group-hover:z-10 origin-center group-hover:delay-300">
        {/* Thumbnail (clickable to watch) */}
        <Link href={`/watch/${video.id}`} tabIndex={-1} className="block">
          <div className="aspect-video bg-gray-800 overflow-hidden rounded-t-md shadow-xl group-hover:shadow-2xl transition-shadow duration-300">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                No Thumbnail
              </div>
            )}
          </div>
        </Link>

        {/* Info box - appears below thumbnail on hover (Premium Netflix style) */}
        <div className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-300 ease-in-out delay-300 bg-[#181818] rounded-b-md shadow-2xl">
          <div className="p-3 space-y-2.5">
            {/* Action buttons row */}
            <div className="flex items-center gap-2">
              <Link 
                href={`/watch/${video.id}`} 
                tabIndex={-1} 
                aria-label={`Play ${video.title}`}
                className="bg-white hover:bg-gray-200 rounded-full w-9 h-9 transform transition-all duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-md hover:scale-110"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" className="w-4 h-4 ml-0.5">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              </Link>
              <button
                className={`rounded-full w-7 h-7 border-2 transition-all duration-150 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white shadow-md hover:scale-110 ${
                  isInWatchlist 
                    ? 'bg-white/95 border-white text-black hover:bg-white' 
                    : 'bg-transparent hover:bg-white/10 border-gray-400/80 hover:border-white text-white'
                }`}
                aria-label={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                tabIndex={-1}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAdd();
                }}
              >
                {isInWatchlist ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                )}
              </button>
              <button
                className="bg-transparent hover:bg-white/10 rounded-full w-7 h-7 border-2 border-gray-400/80 hover:border-white transition-all duration-150 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white text-white shadow-md hover:scale-110"
                aria-label="More Info"
                tabIndex={-1}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMore();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
            
            {/* Title */}
            <h3 className="text-white font-bold text-base line-clamp-1 leading-tight">
              {video.title}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePageClient() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [modalVideo, setModalVideo] = useState<Video | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load watchlist from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('streamharbor-watchlist');
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load watchlist', e);
      }
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('streamharbor-watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    (async () => {
      try {
        // Use the Next.js API proxy so it works in Docker and local dev
        const res = await fetch(`/api/videos`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch videos from backend');
        setVideos(await res.json());
      } catch (error) {
        setVideos([]);
      }
    })();
  }, []);

  function selectHeroVideo(videos: Video[]): Video | undefined {
    const publishedVideos = videos.filter(v => v.status === 'PUBLISHED' && v.thumbnail_url);
    const videosWithDescription = publishedVideos.filter(v => v.description?.trim());
    if (videosWithDescription.length > 0) {
      const randomIndex = Math.floor(Math.random() * videosWithDescription.length);
      return videosWithDescription[randomIndex];
    }
    return publishedVideos[0];
  }

  const publishedVideos = videos.filter(v => v.status === 'PUBLISHED' && v.thumbnail_url);
  const heroVideo = selectHeroVideo(videos);
  const remainingVideos = publishedVideos.filter(v => v.id !== heroVideo?.id);

  if (videos.length === 0) {
    return (
      <main className="container mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to StreamHarbor!</h1>
        <p className="text-gray-400">No videos available. Start by uploading some content!</p>
      </main>
    );
  }

  function handleAdd(video: Video) {
    setWatchlist((prev) => {
      if (prev.includes(video.id)) {
        // Remove from watchlist
        return prev.filter(id => id !== video.id);
      } else {
        // Add to watchlist
        return [...prev, video.id];
      }
    });
  }
  function handleMore(video: Video) {
    setModalVideo(video);
    setModalOpen(true);
  }
  function handleCloseModal() {
    setModalOpen(false);
    setModalVideo(null);
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section - Netflix Style */}
      {heroVideo && (
        <div
          className="relative w-full h-screen flex items-center"
          style={{
            backgroundImage: heroVideo.thumbnail_url ? `url(${heroVideo.thumbnail_url})` : undefined,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          }}
        >
          {/* Left-to-right gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
          
          {/* Bottom gradient overlay - blends hero into content below */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#141414] via-black/60 to-transparent pointer-events-none" />

          {/* Content - Vertically centered with left padding */}
          <div className="relative z-10 px-16 max-w-2xl">
            <div className="space-y-6">
              <h1 className="text-7xl font-bold text-white drop-shadow-2xl font-montserrat"
                  style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>
                {heroVideo.title}
              </h1>
              {heroVideo.description && (
                <p className="text-xl text-gray-100 leading-relaxed drop-shadow-lg"
                   style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  {heroVideo.description}
                </p>
              )}
              <div className="flex items-center gap-4 pt-4">
                <Link 
                  href={`/watch/${heroVideo.id}`}
                  className="inline-flex items-center gap-3 bg-white hover:bg-gray-200 text-black px-8 py-3 rounded-md font-bold text-lg transition-all duration-200 hover:scale-105 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label={`Play ${heroVideo.title}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                  </svg>
                  Play
                </Link>
                <button 
                  className="inline-flex items-center gap-2 bg-gray-500/70 hover:bg-gray-500/50 text-white px-7 py-3 rounded-md font-bold text-lg transition-all duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-white backdrop-blur-sm"
                  aria-label="More Info"
                  onClick={() => handleMore(heroVideo)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  More Info
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VideoDetailsModal for More Info */}
      <VideoDetailsModal video={modalVideo} open={modalOpen} onClose={handleCloseModal} />

      {/* Video Carousels - Full Width Netflix Style */}
      <section className="w-full pb-12 -mt-24 relative z-10">
        {/* My List */}
        {watchlist.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 className="text-xl md:text-2xl font-bold mb-3 text-white tracking-tight px-[60px]">
              My List
            </h2>
            <div className="relative group/carousel overflow-visible">
              <Suspense fallback={<CarouselSkeleton count={6} />}>
                <div className="flex gap-[0.3vw] overflow-x-scroll overflow-y-visible px-[60px] pb-12 pt-2 scrollbar-hide scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {videos.filter(v => watchlist.includes(v.id)).map((video) => (
                    <VideoCard
                      key={`watchlist-${video.id}`}
                      video={video}
                      onAdd={() => handleAdd(video)}
                      onMore={() => handleMore(video)}
                      isInWatchlist={true}
                    />
                  ))}
                </div>
              </Suspense>
            </div>
          </div>
        )}

        {/* Trending Now */}
        {remainingVideos.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 className="text-xl md:text-2xl font-bold mb-3 text-white tracking-tight px-[60px]">
              Trending Now
            </h2>
            <div className="relative group/carousel overflow-visible">
              <Suspense fallback={<CarouselSkeleton count={6} />}>
                <div className="flex gap-[0.3vw] overflow-x-scroll overflow-y-visible px-[60px] pb-12 pt-2 scrollbar-hide scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {remainingVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onAdd={() => handleAdd(video)}
                      onMore={() => handleMore(video)}
                      isInWatchlist={watchlist.includes(video.id)}
                    />
                  ))}
                </div>
              </Suspense>
            </div>
          </div>
        )}

        {/* New Releases */}
        {remainingVideos.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h2 className="text-xl md:text-2xl font-bold mb-3 text-white tracking-tight px-[60px]">
              New Releases
            </h2>
            <div className="relative group/carousel overflow-visible">
              <Suspense fallback={<CarouselSkeleton count={6} />}>
                <div className="flex gap-[0.3vw] overflow-x-scroll overflow-y-visible px-[60px] pb-12 pt-2 scrollbar-hide scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {remainingVideos.map((video) => (
                    <VideoCard
                      key={`new-${video.id}`}
                      video={video}
                      onAdd={() => handleAdd(video)}
                      onMore={() => handleMore(video)}
                      isInWatchlist={watchlist.includes(video.id)}
                    />
                  ))}
                </div>
              </Suspense>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
