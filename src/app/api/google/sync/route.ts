import { NextRequest, NextResponse } from 'next/server';
import { syncGoogleSnapshots } from '@/lib/pap/google-sync';
import { papSessionCookieName, parseSessionCookieValue } from '@/lib/pap/session';

export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(papSessionCookieName)?.value;
  const session = cookie ? parseSessionCookieValue(cookie) : null;

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncGoogleSnapshots({ userId: session.userId, now: new Date() });
    console.log('[Sync] Result:', JSON.stringify(result));
    const status = result.status === 'succeeded' ? 200 : 502;
    return NextResponse.json(result, { status });
  } catch (error) {
    console.error('[Sync] Unexpected error:', error);
    return NextResponse.json({ status: 'failed', errorMessage: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 });
  }
}
