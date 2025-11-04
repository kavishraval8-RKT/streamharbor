import HomePageClient from './HomePageClient';
import { requireAuth } from '@/lib/serverAuth';

export default async function HomePage() {
  // This will redirect to /auth if not authenticated
  // or to /pending-approval if not approved
  await requireAuth();
  
  return <HomePageClient />;
}

