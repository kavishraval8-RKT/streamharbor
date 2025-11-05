import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { redirect } from 'next/navigation';
import { prisma } from './prisma';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-super-secret-key-min-32-chars-long';

export interface AuthUser {
  id?: string;
  email: string;
  name?: string;
  role: 'user' | 'admin';
  isApproved: boolean;
}

export async function requireAuth(): Promise<AuthUser> {
  const token = cookies().get('auth-token')?.value;

  if (!token) {
    redirect('/auth');
  }

  try {
    const payload = verify(token, JWT_SECRET) as any;
    
    // Check database for current approval status (in case admin revoked)
    if (payload.role !== 'admin') {
      try {
        const user = await prisma.user.findUnique({ where: { email: payload.email } });
        if (!user) {
          // User was deleted - clear the invalid cookie before redirecting
          cookies().delete('auth-token');
          redirect('/auth');
        }
        const isApproved = (user as any).isApproved ?? true;
        if (isApproved === false) {
          // Bubble the redirect instead of logging it as an error
          redirect('/pending-approval');
        }
      } catch (dbError: any) {
        // If this is the Next.js redirect error, rethrow it so Next can handle it
        if (dbError && typeof dbError.digest === 'string' && dbError.digest.startsWith('NEXT_REDIRECT')) {
          throw dbError;
        }
        // Log non-redirect DB issues once
        console.error('Database check failed (non-redirect):', dbError);
        // If DB check fails but token says not approved, still redirect
        if (payload.isApproved === false) {
          redirect('/pending-approval');
        }
      }
    }

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role || 'user',
      isApproved: payload.isApproved !== false,
    };
  } catch (error) {
    // Invalid token - redirect to auth (cookie will be cleared by logout route)
    redirect('/auth');
  }
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (user.role !== 'admin') {
    redirect('/');
  }

  return user;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const token = cookies().get('auth-token')?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verify(token, JWT_SECRET) as any;
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role || 'user',
      isApproved: payload.isApproved !== false,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Check authentication for API routes - verifies token AND checks database for approval status
 * Returns user if authenticated and approved, null otherwise
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const token = cookies().get('auth-token')?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = verify(token, JWT_SECRET) as any;
    
    // Always check database for current approval status
    try {
      const user = await prisma.user.findUnique({ 
        where: { email: payload.email }
      });
      
      if (!user) {
        return null;
      }

      const isApproved = (user as any).isApproved ?? true;
      
      // If not approved (including revoked), return null
      if (payload.role !== 'admin' && isApproved === false) {
        return null;
      }

      return {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role || 'user',
        isApproved: payload.role === 'admin' || isApproved,
      };
    } catch (dbError) {
      console.error('Database check failed:', dbError);
      return null;
    }
  } catch (error) {
    return null;
  }
}
