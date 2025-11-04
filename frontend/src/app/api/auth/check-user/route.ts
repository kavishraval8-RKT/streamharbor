import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verify, sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-super-secret-key-min-32-chars-long';

// GET: Check current logged-in user's approval status and refresh token
export async function GET() {
  try {
    const token = cookies().get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verify(token, JWT_SECRET) as any;
    
    // Get fresh user data from database
    const user = await prisma.user.findUnique({ 
      where: { email: payload.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isApproved = (user as any).isApproved ?? true;

    // If approval status changed, issue new token
    if (isApproved !== payload.isApproved) {
      const newToken = sign(
        {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: payload.role || 'user',
          isApproved: isApproved,
        },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      cookies().set('auth-token', newToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
    }

    return NextResponse.json({ 
      email: user.email, 
      name: user.name,
      isApproved: isApproved 
    });

  } catch (error) {
    console.error('Check user error:', error);
    return NextResponse.json({ error: 'Failed to check user' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@streamharbor.local';
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      return NextResponse.json({ exists: !!user, isApproved: (user as any)?.isApproved ?? null });
    } catch (dbErr) {
      // Database likely unavailable in local dev. Fall back to safe defaults.
      console.error('check-user prisma error:', dbErr);
      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        // Allow admin to proceed to login without DB
        return NextResponse.json({ exists: true, isApproved: true });
      }
      // Everyone else can proceed to registration flow; keep status 200 so UI continues
      return NextResponse.json({ exists: false, isApproved: null });
    }
  } catch (e) {
    // Malformed request body
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
