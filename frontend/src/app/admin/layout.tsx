import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verify } from 'jsonwebtoken';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get('auth-token')?.value;
  const callback = '/admin/dashboard';

  if (!token) {
    redirect(`/auth?callbackUrl=${encodeURIComponent(callback)}`);
  }

  try {
    const secret = process.env.NEXTAUTH_SECRET || 'your-super-secret-key-min-32-chars-long';
    const payload = verify(token, secret) as any;
    if (payload?.role !== 'admin') {
  redirect('/');
    }
  } catch (e) {
    // Invalid or expired token
    redirect(`/auth?callbackUrl=${encodeURIComponent(callback)}`);
  }

  return <>{children}</>;
}