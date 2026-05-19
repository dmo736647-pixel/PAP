import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/pap/prisma';
import { canAccessPrivateAlpha } from '@/lib/pap/private-alpha-access';
import { papSessionCookieName, parseSessionCookieValue } from '@/lib/pap/session';
import type { GoogleConnectionState } from '@/lib/pap/private-alpha-types';

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(papSessionCookieName)?.value;
  const session = cookie ? parseSessionCookieValue(cookie) : null;

  if (!session) {
    return NextResponse.json({ state: 'logged_out' satisfies GoogleConnectionState, hasWorkspace: false });
  }

  const invite = await prisma.alphaInvite.findUnique({ where: { email: session.email } });
  if (!canAccessPrivateAlpha(invite)) {
    return NextResponse.json({ state: 'not_invited' satisfies GoogleConnectionState, hasWorkspace: false });
  }

  const [credential, latestSync, latestWorkspace] = await Promise.all([
    prisma.googleCredential.findFirst({
      where: { userId: session.userId, revokedAt: null },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.googleSyncRun.findFirst({
      where: { userId: session.userId },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.papWorkspace.findFirst({
      where: { userId: session.userId, source: 'google' },
      orderBy: { generatedAt: 'desc' },
    }),
  ]);
  const hasWorkspace = Boolean(latestWorkspace);

  if (!credential) {
    return NextResponse.json({ state: 'logged_out' satisfies GoogleConnectionState, hasWorkspace });
  }

  if (latestSync?.status === 'running') {
    return NextResponse.json({ state: 'syncing' satisfies GoogleConnectionState, hasWorkspace });
  }

  if (latestSync?.status === 'failed') {
    return NextResponse.json({ state: 'sync_failed' satisfies GoogleConnectionState, hasWorkspace });
  }

  if (latestWorkspace) {
    return NextResponse.json({ state: 'synced' satisfies GoogleConnectionState, hasWorkspace });
  }

  return NextResponse.json({ state: 'connected_not_synced' satisfies GoogleConnectionState, hasWorkspace });
}
