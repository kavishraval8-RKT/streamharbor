"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Logo() {
  const [imgError, setImgError] = useState(false);
  
  return (
    <Link href="/" className="flex items-center py-3">
      <div className="h-20 relative flex items-center">
        {imgError ? (
          <span className="text-white text-3xl font-bold">StreamHarbor</span>
        ) : (
          <Image
            src="/streamharbor-logo.png"
            alt="StreamHarbor"
            width={400}
            height={80}
            className="object-contain hover:opacity-90 transition-opacity"
            priority
            onError={() => setImgError(true)}
            style={{ 
              maxHeight: '80px',
              minWidth: '400px',
            }}
          />
        )}
      </div>
    </Link>
  );
}