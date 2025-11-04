import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-super-secret-key-min-32-chars-long';

export async function GET(request: Request) {
  try {
    let token = cookies().get('auth-token')?.value;

    // Fallback: try to read from cookie header
    if (!token) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/auth-token=([^;]+)/);
      token = match ? decodeURIComponent(match[1]) : undefined;
    }

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let payload: any;
    try {
      payload = verify(token, JWT_SECRET) as any;
    } catch (err) {
      console.error('token verify error', err);
      // Don't expose internal error messages to clients
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, user: payload });
  } catch (err) {
    console.error('me route error', err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
