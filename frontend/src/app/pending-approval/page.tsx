import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PendingApprovalClient from './PendingApprovalClient';

// Ensure this page is always evaluated on the server with fresh data
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-super-secret-key-min-32-chars-long';

export default async function PendingApprovalPage() {
  // Check authentication status on server-side
  const token = cookies().get('auth-token')?.value;

  if (!token) {
    // Not logged in, redirect to auth
    redirect('/auth');
  }

  try {
    const payload = verify(token, JWT_SECRET) as any;
    
    // Check current approval status from database
    const user = await prisma.user.findUnique({
      where: { email: payload.email }
    });

    if (!user) {
      // User not found, redirect to auth
      redirect('/auth');
    }

    const isApproved = (user as any).isApproved ?? true;
    
    // If user is now approved, redirect to home immediately
    if (payload.role === 'admin' || isApproved === true) {
      redirect('/');
    }

    // User is still pending, show the pending page
  } catch (error) {
    // Invalid token, redirect to auth
    redirect('/auth');
  }

  // Render the client component for user interaction
  return <PendingApprovalClient />;
}
