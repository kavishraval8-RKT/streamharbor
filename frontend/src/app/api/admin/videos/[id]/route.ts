import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/serverAuth';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  // Enforce admin access
  await requireAdmin();

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const base =
    process.env.BACKEND_INTERNAL_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://api.streamharbor.me';

  try {
    const target = `${base.replace(/\/$/, '')}/api/videos/${encodeURIComponent(id)}`;
    const resp = await fetch(target, { method: 'DELETE', cache: 'no-store' });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return NextResponse.json({ error: 'Backend delete failed', details: text }, { status: resp.status || 500 });
    }

    // Backend may or may not return JSON; normalize to a simple ok result
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Admin delete proxy error:', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
