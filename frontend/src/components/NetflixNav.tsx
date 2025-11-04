"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from 'next/navigation';
import NavSearch from '@/components/NavSearch';
import AuthNav from '@/components/AuthNav';

export default function NetflixNav() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  // Always call hooks before any conditional returns
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hide nav entirely on auth-related public pages and watch player page
  if (pathname === '/auth' || pathname === '/pending-approval' || pathname?.startsWith('/watch/')) {
    return null;
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-black/95 backdrop-blur-sm shadow-lg"
          : "bg-gradient-to-b from-black via-black/80 to-transparent"
      }`}
    >
      <div className="px-12 py-4 flex justify-between items-center">
        {/* Left Group: Logo and Navigation Links */}
        <div className="flex items-center space-x-8">
          {/* Netflix-style Logo */}
          <Link
            href="/"
            prefetch={false}
            className="text-red-600 font-bold text-3xl tracking-wide hover:text-red-500 transition-colors"
          >
            StreamHarbor
          </Link>
          <Link
            href="/"
            prefetch={false}
            className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
          >
            Home
          </Link>
          <Link
            href="/browse"
            prefetch={false}
            className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
          >
            Movies
          </Link>
        </div>

        {/* Right Group: Search, Settings, and Profile */}
        <div className="flex items-center space-x-4">
          <NavSearch />
          <AuthNav />
          <Link
            href="/settings"
            prefetch={false}
            className="text-gray-300 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            title="Settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  );
}
