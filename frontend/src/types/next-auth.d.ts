// Minimal local type declarations to satisfy TypeScript for next-auth v5 beta / @auth packages
// This file provides small, safe typings used by the app and avoids TS "cannot find module" errors.

declare module 'next-auth' {
  export type JWT = Record<string, any>;

  export interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  }

  export interface Session {
    user: User;
    expires?: string;
  }

  export type NextAuthOptions = any;
  export type NextAuthConfig = any;

  export default function NextAuth(options: any): any;
}

declare module 'next-auth/react' {
  import type { Session } from 'next-auth';

  export function signIn(provider: string, data?: any): Promise<any>;
  export function signOut(options?: any): Promise<void>;
  export function useSession(): { data?: Session | null; status: 'loading' | 'authenticated' | 'unauthenticated' };
}

declare module 'next-auth/providers/credentials' {
  export default function CredentialsProvider(options?: any): any;
}
