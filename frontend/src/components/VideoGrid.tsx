import Link from 'next/link';

interface Video {
  id: string;
  title: string;
  description?: string | null;
  thumbnail_url?: string | null;
  status: 'PROCESSING' | 'PUBLISHED' | 'ERROR';
}

interface VideoGridProps {
  videos: Video[];
  onMoreInfo?: (video: Video) => void;
}

export default function VideoGrid({ videos, onMoreInfo }: VideoGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {videos.filter(v => v.status === 'PUBLISHED').map(video => (
        <div key={video.id} className="group relative">
          {/* Aspect ratio container */}
          <div className="aspect-video w-full bg-gray-900 rounded-md overflow-hidden">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-cover transform transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                No Thumbnail
              </div>
            )}
          </div>
          
          {/* Info overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
            <h3 className="text-white font-medium text-lg leading-tight mb-1">
              {video.title}
            </h3>
            {video.description && (
              <p className="text-gray-300 text-sm line-clamp-2 mb-3">
                {video.description}
              </p>
            )}
            
            {/* Action buttons - hidden by default, shown on hover */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
              <Link 
                href={`/watch/${video.id}`}
                className="bg-white hover:bg-gray-200 rounded-full w-9 h-9 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={`Play ${video.title}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" className="w-5 h-5 ml-0.5">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              </Link>
              
              {onMoreInfo && (
                <button
                  onClick={() => onMoreInfo(video)}
                  className="bg-black/60 hover:bg-black/80 rounded-full w-9 h-9 border-2 border-gray-300/70 hover:border-white flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg text-white backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="More Info"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}