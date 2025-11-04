"use client";

import Link from 'next/link';
import { useEffect } from 'react';

interface Video {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  status?: string;
}

interface InfoModalProps {
  video: Video | null;
  onClose: () => void;
}

export default function InfoModal({ video, onClose }: InfoModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (video) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [video, onClose]);

  if (!video) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#181818] rounded-lg shadow-2xl max-w-3xl w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Thumbnail Header */}
        <div className="relative aspect-video w-full bg-gray-900">
          {video.thumbnail_url ? (
            <img 
              src={video.thumbnail_url} 
              alt={video.title} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Gradient overlay for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-[#181818] hover:bg-[#282828] rounded-full p-2 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Link 
              href={`/watch/${video.id}`}
              className="bg-white hover:bg-gray-200 text-black px-8 py-3 rounded-md font-bold text-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
              Play
            </Link>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white font-montserrat">
            {video.title}
          </h2>

          {/* Description */}
          {video.description && (
            <p className="text-gray-300 text-base leading-relaxed">
              {video.description}
            </p>
          )}

          {/* Additional info could go here */}
          <div className="pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Click Play to start watching
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
