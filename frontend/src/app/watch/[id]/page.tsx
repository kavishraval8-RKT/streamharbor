// Import our NEW wrapper component
import WatchPlayer from '@/components/WatchPlayer';
import { requireAuth } from '@/lib/serverAuth';

// This function runs on the server to get the video data
// Use the same backend resolution as our API routes (works in dev and prod)
async function getVideo(id: string) {
  try {
    const base =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:8080';

    const res = await fetch(`${base}/api/videos/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch video: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// This is the page component
export default async function WatchPage({ params }: { params: { id: string } }) {
  // Ensure user is authenticated and approved
  await requireAuth();
  
  const { id } = params;
  const video = await getVideo(id);

  if (!video) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-4xl font-bold">Video not found.</h1>
      </main>
    );
  }

  // Pass the whole video object to the client WatchPlayer which will take over the full screen
  return <WatchPlayer video={video} />;
}