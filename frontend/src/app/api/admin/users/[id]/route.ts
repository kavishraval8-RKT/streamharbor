import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-super-secret-key-min-32-chars-long';

function getAdmin(request: Request): any | null {
  let token = cookies().get('auth-token')?.value;
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/auth-token=([^;]+)/);
    token = match ? decodeURIComponent(match[1]) : undefined;
  }
  if (!token) return null;
  try {
    const payload = verify(token, JWT_SECRET) as any;
    return payload?.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = context.params.id;
  const body = await request.json().catch(() => ({}));
  
  // Support both approve and disapprove
  const isApproved = body?.approve === true ? true : body?.approve === false ? false : null;
  if (isApproved === null) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  try {
    // Bypass Prisma TS limitations by using 'any' cast for data
    const updated = await (prisma.user as any).update({
      where: { id },
      data: { isApproved },
      select: { id: true, email: true, isApproved: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const admin = getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = context.params.id;

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
