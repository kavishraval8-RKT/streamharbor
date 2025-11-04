import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-super-secret-key-min-32-chars-long';

export async function POST(request: Request) {
  try {
    // Support both JSON and form submissions
    const contentType = request.headers.get('content-type') || '';
    let email = '';
    let password = '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = body?.email || '';
      password = body?.password || '';
    } else {
      const form = await request.formData();
      email = String(form.get('email') || '');
      password = String(form.get('password') || '');
    }

    const url = new URL(request.url);
    const rawCb = url.searchParams.get('callbackUrl') || '/';
    const callbackUrl = rawCb.startsWith('/') ? rawCb : '/';

    console.log('🔐 Login attempt for:', email);

    // Admin backdoor (dev only)
    if (email === 'admin@streamharbor.local' && password === 'admin123') {
      console.log('✅ Admin login successful');
      const token = sign({ email, name: 'Admin', role: 'admin', isApproved: true }, JWT_SECRET, { expiresIn: '1d' });
      console.log('🍪 Setting auth-token cookie for admin');
      // Set via cookies() API (attaches to the outgoing response for this request)
      cookies().set('auth-token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
      console.log('✓ Cookie set (cookies API), token length:', token.length);
      const response = NextResponse.json({ success: true, user: { email, name: 'Admin', role: 'admin', isApproved: true } });
      // If this was a form POST, redirect server-side to avoid client timing issues
      if (!contentType.includes('application/json')) {
        const redirectUrl = new URL(callbackUrl, request.url);
        const redirectRes = NextResponse.redirect(redirectUrl, { status: 303 });
        redirectRes.cookies.set({
          name: 'auth-token',
          value: token,
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24,
        });
        return redirectRes;
      }
      return response;
    }

    // Regular user login via Prisma
    console.log('🔍 Looking up user in database...');
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.log('❌ User not found:', email);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    if (!user.password) {
      console.log('❌ User has no password set:', email);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    console.log('🔑 User found, checking password...');
    const ok = await bcrypt.compare(password, user.password);
    console.log('🔑 Password match:', ok);
    
    if (!ok) {
      console.log('❌ Invalid password for:', email);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check approval
    const isApproved = (user as any).isApproved ?? true;
    console.log('✓ User approval status:', isApproved);

    console.log('✅ User login successful:', email);
    // Issue token (role: user) - include isApproved status
    const token = sign(
      {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        role: 'user',
        isApproved: isApproved,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log('🍪 Setting auth-token cookie for user:', email);
    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    });
    console.log('✓ Cookie set (cookies API), token length:', token.length);

    // If user is not approved, redirect to pending page
    const finalCallbackUrl = isApproved ? callbackUrl : '/pending-approval';

    const response = NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name, role: 'user', isApproved } 
    });
    
    // If this was a form POST, redirect server-side
    if (!contentType.includes('application/json')) {
      const redirectUrl = new URL(finalCallbackUrl, request.url);
      const redirectRes = NextResponse.redirect(redirectUrl, { status: 303 });
      redirectRes.cookies.set({
        name: 'auth-token',
        value: token,
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,
      });
      return redirectRes;
    }
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}