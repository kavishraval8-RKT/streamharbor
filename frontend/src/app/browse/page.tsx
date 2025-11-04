import VideoGrid from '@/components/VideoGrid';
import dynamic from 'next/dynamic';
import { requireAuth } from '@/lib/serverAuth';
import BrowsePageClient from './BrowsePageClient';

export default async function BrowsePage() {
  // Ensure user is authenticated and approved
  await requireAuth();
  
  return <BrowsePageClient />;
}