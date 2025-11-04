import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/serverAuth';

// GET /api/profile - Get current user's profile
export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in again' },
        { status: 401 }
      );
    }

    // Find user by email and include their profile
    const user = await prisma.user.findUnique({
      where: { email: authUser.email },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If no profile exists, create one
    let profile = user.profile;
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId: user.id,
        },
      });
    }

    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      bio: profile.bio,
      userId: profile.userId,
    });
  } catch (error: any) {
    console.error('Error fetching profile - Full details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to load profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in again' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username, bio } = body;

    // Basic validation
    if (username !== undefined && typeof username !== 'string') {
      return NextResponse.json(
        { error: 'Invalid username format' },
        { status: 400 }
      );
    }

    if (bio !== undefined && typeof bio !== 'string') {
      return NextResponse.json(
        { error: 'Invalid bio format' },
        { status: 400 }
      );
    }

    // Username length validation
    if (username !== undefined && username.length > 0 && username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: authUser.email },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: { username?: string | null; bio?: string | null } = {};
    if (username !== undefined) {
      updateData.username = username || null;
    }
    if (bio !== undefined) {
      updateData.bio = bio || null;
    }

    // Update or create profile
    const profile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData,
      },
    });

    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      bio: profile.bio,
      userId: profile.userId,
      message: 'Profile updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating profile - Full details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Handle unique constraint violation (duplicate username)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
