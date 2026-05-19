import { NextRequest, NextResponse } from 'next/server';
import { syncGoogleSnapshots } from '@/lib/pap/google-sync';
import { prisma } from '@/lib/pap/prisma';
import { canAccessPrivateAlpha } from '@/lib/pap/private-alpha-access';
import { papSessionCookieName, parseSessionCookieValue } from '@/lib/pap/session';

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(papSessionCookieName)?.value;
  const session = cookie ? parseSessionCookieValue(cookie) : null;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const invite = await prisma.alphaInvite.findUnique({ where: { email: session.email } });
  if (!canAccessPrivateAlpha(invite)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await syncGoogleSnapshots({ userId: session.userId, now: new Date() });

  if (result.status === 'succeeded') {
    return NextResponse.json({ ok: true, result });
  }

  return NextResponse.json({ ok: false, result }, { status: 502 });
}
