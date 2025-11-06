import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/serverAuth';

export async function GET(request: Request) {
  // Check authentication and approval status
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';

    const base =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'https://api.streamharbor.me';

    const target = new URL('/api/videos', base);
    if (q) target.searchParams.set('q', q);

    // Add a short timeout so the UI doesn't hang if backend is down in dev
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    const response = await fetch(target.toString(), { cache: 'no-store', signal: controller.signal }).catch((e) => {
      console.warn('videos proxy: backend unreachable, returning empty list');
      return null;
    });
    clearTimeout(timeout);

    if (!response || !response.ok) {
      // Graceful dev fallback: return an empty list instead of a 500 to avoid noisy UI
      return NextResponse.json([]);
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching videos:', error);
    // Final safety: return empty list on unexpected errors
    return NextResponse.json([]);
  }
}