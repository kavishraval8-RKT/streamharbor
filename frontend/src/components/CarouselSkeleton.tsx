"use client";

import React from 'react';

type Props = {
  count?: number;
};

export default function CarouselSkeleton({ count = 6 }: Props) {
  return (
    <div className="flex gap-4 overflow-x-hidden pb-4 -mx-4 px-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-72 flex-shrink-0 rounded-md bg-gray-800 overflow-hidden"
        >
          <div className="aspect-video w-72 bg-gray-800 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
