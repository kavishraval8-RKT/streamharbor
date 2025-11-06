import { NextResponse } from 'next/server';

function backendBase() {
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://api.streamharbor.me'
  );
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const target = `${backendBase()}/api/videos/${encodeURIComponent(params.id)}`;
    const res = await fetch(target, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'not found' }, { status: res.status });
    const json = await res.json();
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: 'backend unavailable' }, { status: 502 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const target = `${backendBase()}/api/videos/${encodeURIComponent(params.id)}`;
    const res = await fetch(target, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: 'backend unavailable' }, { status: 502 });
  }
}
