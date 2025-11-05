/*
  auth.ts
  NextAuth configuration with Prisma adapter for persistent user storage
*/

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import type { User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { NextURL } from 'next/dist/server/web/next-url';

interface AuthUser extends Omit<User, 'id'> {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface CustomSession {
  user: AuthUser;
}

export const config = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  trustHost: true, // Trust the X-Forwarded-Host header
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  events: {
    // Automatically create a Profile when a new user is created
    createUser: async ({ user }: { user: User }) => {
      if (user.id) {
        await prisma.profile.create({
          data: {
            userId: user.id,
          },
        });
        console.log(`Created profile for user: ${user.id}`);
      }
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: any): Promise<AuthUser | null> {
        const adminEmail = 'admin@streamharbor.local';
        const adminPassword = 'admin123';

        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error('Missing credentials');
          }

          if (credentials.email === adminEmail && credentials.password === adminPassword) {
            return {
              id: '1',
              email: adminEmail,
              name: 'Admin',
              role: 'admin',
            };
          }

          return null;
        } catch (error) {
          console.error('Auth error:', error);
          throw new Error('Authentication failed');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: AuthUser }) {
      if (user?.role) token.role = user.role;
      return token;
    },
    async session({ session, token }: { session: CustomSession; token: JWT & { role?: string } }) {
      if (token?.role) {
        session.user = { ...session.user, role: token.role };
      }
      return session;
    },
    // Keep authorized minimal; NextAuth handles most flows. This is a convenience hook.
    async authorized({ auth, request }: { auth: any; request: { nextUrl: NextURL } }) {
      const isLoggedIn = !!auth?.user;
      const isAdmin = auth?.user?.role === 'admin';
      const path = request.nextUrl.pathname;

      // Always allow access to login page and auth endpoints
      if (path.startsWith('/login') || path.startsWith('/api/auth')) {
        return true;
      }

      // Protect admin and upload routes
      if (path.startsWith('/admin') || path.startsWith('/upload')) {
        if (!isLoggedIn) {
          return false;
        }
        if (!isAdmin) {
          return false;
        }
      }

      return true;
    },
  },
};

// Export handler and helpers for routes/middleware that call into this file.
export const { handlers, auth, signIn, signOut } = NextAuth(config);