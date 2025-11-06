import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

// Force dynamic rendering for this API route (uses cookies)
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-super-secret-key-min-32-chars-long';

function isAdmin(request: Request): boolean {
  let token = cookies().get('auth-token')?.value;
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/auth-token=([^;]+)/);
    token = match ? decodeURIComponent(match[1]) : undefined;
  }
  if (!token) return false;
  try {
    const payload = verify(token, JWT_SECRET) as any;
    return payload?.role === 'admin';
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    if (!isAdmin(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch full users then map to include approval flag without tripping TS on older client types
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const safe = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name ?? null,
      createdAt: u.createdAt?.toISOString() ?? null,
      updatedAt: u.updatedAt?.toISOString() ?? null,
      isApproved: u.isApproved ?? false,
    }));
    return NextResponse.json(safe);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
