import { NextRequest, NextResponse } from 'next/server';
import { decryptSecret } from '@/lib/pap/crypto';
import { sendGmailReply } from '@/lib/pap/google-api';
import { prisma } from '@/lib/pap/prisma';
import { papSessionCookieName, parseSessionCookieValue } from '@/lib/pap/session';

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(papSessionCookieName)?.value;
  const session = cookie ? parseSessionCookieValue(cookie) : null;

  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const invite = await prisma.alphaInvite.findUnique({ where: { email: session.email } });
  if (!invite || invite.status === 'revoked') {
    return NextResponse.json({ error: 'Not invited' }, { status: 403 });
  }

  const body = await request.json() as {
    threadId?: string;
    to?: string;
    subject?: string;
    body?: string;
  };

  if (!body.threadId || !body.to || !body.subject || !body.body) {
    return NextResponse.json({ error: 'Missing required fields: threadId, to, subject, body' }, { status: 400 });
  }

  try {
    const credential = await prisma.googleCredential.findFirst({
      where: { userId: session.userId, revokedAt: null },
      orderBy: { updatedAt: 'desc' },
    });

    if (!credential) {
      return NextResponse.json({ error: 'No Google credential found' }, { status: 400 });
    }

    const accessToken = decryptSecret(credential.accessTokenEncrypted);

    const result = await sendGmailReply({
      accessToken,
      threadId: body.threadId,
      to: body.to,
      subject: body.subject,
      body: body.body,
    });

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send reply';
    console.error('[Send Reply Error]', error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
