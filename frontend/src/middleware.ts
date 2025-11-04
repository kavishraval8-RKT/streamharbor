import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const adminOnlyRoutes = [
  /^\/admin(?:\/.*)?$/  // All admin routes
];

const publicRoutes = [
  '/auth',
  '/login',
  '/pending-approval',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and API routes
  if (publicRoutes.includes(pathname) || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  console.log('🔍 Middleware checking:', pathname);

  const token = request.cookies.get('auth-token')?.value;

  // No token - redirect to login
  if (!token) {
    console.log('✗ No auth token, redirecting to /auth');
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token exists - let it pass and verify on server side
  // Edge runtime can't use jsonwebtoken, so we do basic checks here
  console.log('✓ Auth cookie present, allowing access to:', pathname);

  // Note: Full JWT verification happens in API routes and server components
  // This middleware just checks for the presence of the auth cookie
  return NextResponse.next();
}

// Configure middleware to match all routes except public assets and auth pages
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, favicon.svg
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon|auth|pending-approval).*)'
  ]
};