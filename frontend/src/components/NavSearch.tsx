"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface SearchResult {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  status: string;
  created_at: string;
}

interface NavSearchProps {
  value?: string;
  onSearch?: (query: string) => void;
}

export default function NavSearch({ value, onSearch }: NavSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState(value ?? '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Auto-focus when search opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Dynamic search with debouncing
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If query is empty, clear results
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Show loading state
    setIsLoading(true);

    // Debounce: wait 300ms after user stops typing
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setResults([]);
      }
    }
    
    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSearchOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        setResults([]);
        setQuery('');
      }
    }
    
    if (isSearchOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isSearchOpen]);

  function handleChange(newQuery: string) {
    setQuery(newQuery);
  }

  function handleBlur() {
    // Delay closing to allow clicking on results
    setTimeout(() => {
      if (!containerRef.current?.matches(':hover')) {
        setIsSearchOpen(false);
      }
    }, 200);
  }

  function handleResultClick(videoId: number) {
    // Navigate to video watch page
    router.push(`/watch/${videoId}`);
    // Close search and clear
    setIsSearchOpen(false);
    setQuery('');
    setResults([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // If there are results, go to first one
    if (results.length > 0) {
      handleResultClick(results[0].id);
    }
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Search Icon - shows when closed */}
      {!isSearchOpen && (
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Open search"
          className="text-gray-300 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      )}

      {/* Search Input - expands with animation when open */}
      {isSearchOpen && (
        <form onSubmit={handleSubmit} className="relative">
          {/* Search Bar */}
          <div className="relative animate-in slide-in-from-right duration-300">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="Titles, people, genres"
              className="w-64 md:w-80 bg-black/90 backdrop-blur-sm text-white text-sm border border-white/30 
                         rounded-sm pl-10 pr-9 py-2.5
                         placeholder-gray-400 placeholder:text-sm
                         focus:outline-none focus:bg-black focus:border-white/60
                         hover:bg-black/95 hover:border-white/40
                         transition-all duration-200"
              aria-label="Search videos"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white 
                           transition-colors duration-150 p-1 rounded-full hover:bg-white/10"
                aria-label="Clear search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown Results - Netflix Style */}
          {(query.length > 0 && (isLoading || results.length > 0)) && (
            <div className="absolute top-full right-0 mt-2 w-96 bg-black/95 backdrop-blur-md border border-white/20 
                            rounded-md shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {isLoading ? (
                <div className="p-6 text-center text-gray-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
                  <p className="mt-2 text-sm">Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <div className="max-h-[500px] overflow-y-auto">
                  {results.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => handleResultClick(video.id)}
                      className="w-full flex items-start gap-3 p-3 hover:bg-white/10 transition-colors duration-150 text-left"
                    >
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-28 h-16 bg-gray-800 rounded overflow-hidden">
                        {video.thumbnail_url ? (
                          <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-8 w-8 text-gray-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Video Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm line-clamp-1">{video.title}</h4>
                        {video.description && (
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{video.description}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {/* No Results Message */}
          {query.length > 0 && !isLoading && results.length === 0 && (
            <div className="absolute top-full right-0 mt-2 w-96 bg-black/95 backdrop-blur-md border border-white/20 
                            rounded-md shadow-2xl p-6 text-center z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-gray-600 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-400 text-sm">No results found for "{query}"</p>
              <p className="text-gray-500 text-xs mt-1">Try different keywords</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
