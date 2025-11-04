"use client";

import Link from "next/link";

export default function AuthHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black via-black/80 to-transparent">
      <div className="px-12 py-4">
        <Link
          href="/"
          className="text-red-600 font-bold text-3xl tracking-wide hover:text-red-500 transition-colors inline-block"
        >
          StreamHarbor
        </Link>
      </div>
    </header>
  );
}
