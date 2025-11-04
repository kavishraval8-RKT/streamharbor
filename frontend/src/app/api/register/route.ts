import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);

    // Create user (rely on DB default for isApproved)
    const user = await prisma.user.create({
      data: {
        email,
        name: name ?? null,
        password: hash,
      },
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (e: any) {
    console.error('Register error - Full details:', e);
    console.error('Error message:', e.message);
    console.error('Error stack:', e.stack);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create user',
        details: process.env.NODE_ENV === 'development' ? e.message : undefined 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
