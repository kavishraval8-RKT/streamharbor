import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export async function GET(request: Request) {
  // Check authentication
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get search query from URL
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';

    // If no query, return empty results
    if (!q.trim()) {
      return NextResponse.json([]);
    }

    // Proxy to backend videos API with search query
    const base =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'https://api.streamharbor.me';

    const target = new URL('/api/videos', base);
    target.searchParams.set('q', q);

    // Add timeout so UI doesn't hang if backend is down
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(target.toString(), { 
      cache: 'no-store', 
      signal: controller.signal 
    }).catch((e) => {
      console.warn('search proxy: backend unreachable, returning empty list');
      return null;
    });
    
    clearTimeout(timeout);

    if (!response || !response.ok) {
      return NextResponse.json([]);
    }
    
    const data = await response.json();
    
    // Filter to only show PUBLISHED videos and limit to 8 results for dropdown
    const published = data.filter((v: any) => v.status === 'PUBLISHED').slice(0, 8);
    
    return NextResponse.json(published);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json([]);
  }
}
