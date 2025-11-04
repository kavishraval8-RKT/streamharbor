"use client";
import Link from "next/link";
import Logo from '@/components/Logo';
import AuthNav from '@/components/AuthNav';

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black via-black/80 to-transparent">
      <div className="px-12 py-4 flex justify-between items-center">
        {/* Left: Logo */}
        <Logo />

        {/* Center: Navigation Links */}
        <div className="flex items-center gap-8 ml-20">
          <Link href="/" 
            className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
            Home
          </Link>
          <Link href="/browse" 
            className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
            Movies
          </Link>
        </div>

        {/* Right: Admin and Upload - Search is rendered by HomePageClient as fixed positioned */}
        <div className="flex items-center gap-4">
          <AuthNav />
        </div>
      </div>
    </nav>
  );
}
