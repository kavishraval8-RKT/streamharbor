"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      setQuery('');
    }
  }

  // Close search on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Toggle search"
        onClick={() => setOpen((s) => !s)}
        className="text-gray-300 hover:text-white transition-colors"
        suppressHydrationWarning
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z" />
        </svg>
      </button>

      <form onSubmit={handleSearch} className={`flex items-center transition-all duration-200 ${open ? 'w-48' : 'w-0 overflow-hidden'}`} suppressHydrationWarning>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="bg-black/40 border border-transparent focus:border-gray-600 rounded px-3 py-1 text-white placeholder-gray-400 w-full"
          aria-label="Search input"
          suppressHydrationWarning
        />
      </form>
    </div>
  );
}
