"use client";
import React from 'react';

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string | null;
}

interface Props {
  video: Video | null;
  open: boolean;
  onClose: () => void;
}

export default function VideoDetailsModal({ video, open, onClose }: Props) {
  if (!open || !video) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[#181818] rounded-lg shadow-2xl max-w-lg w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 rounded-full"
          aria-label="Close details"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {video.thumbnail_url && (
          <img src={video.thumbnail_url} alt={video.title} className="w-full h-48 object-cover rounded mb-4" />
        )}
        <h2 className="text-2xl font-bold mb-2 text-white font-montserrat">{video.title}</h2>
        {video.description && (
          <p className="text-gray-300 mb-4">{video.description}</p>
        )}
        <button
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
          aria-label="Play video"
        >
          Play
        </button>
      </div>
    </div>
  );
}
