import { NextResponse } from 'next/server';
import { papSessionCookieName } from '@/lib/pap/session';

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.delete(papSessionCookieName);

  return response;
}
