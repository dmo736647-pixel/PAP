import { NextRequest, NextResponse } from 'next/server';
import { encryptSecret } from '@/lib/pap/crypto';
import { exchangeGoogleCodeForTokens, fetchGoogleProfile, readGoogleOAuthConfig } from '@/lib/pap/google-oauth';
import { prisma } from '@/lib/pap/prisma';
import { canAccessPrivateAlpha, normalizeEmail } from '@/lib/pap/private-alpha-access';
import { createSessionCookieValue, papSessionCookieName } from '@/lib/pap/session';

function redirectTo(auth: 'connected' | 'failed' | 'not-invited') {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return NextResponse.redirect(new URL(`/?auth=${auth}`, appUrl));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const stateCookie = request.cookies.get('pap_oauth_state')?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    console.error('[Google OAuth Callback] State mismatch', { hasCode: !!code, hasState: !!state, hasCookie: !!stateCookie });
    const response = redirectTo('failed');
    response.cookies.delete('pap_oauth_state');
    return response;
  }

  try {
    const config = readGoogleOAuthConfig();
    console.log('[Google OAuth] Exchanging code for tokens...');
    const tokens = await exchangeGoogleCodeForTokens({ code, config });
    console.log('[Google OAuth] Tokens received, fetching profile...');
    const profile = await fetchGoogleProfile({ accessToken: tokens.access_token });
    const email = normalizeEmail(profile.email);
    console.log('[Google OAuth] Profile email:', email);
    const invite = await prisma.alphaInvite.findUnique({ where: { email } });
    console.log('[Google OAuth] Invite found:', invite);

    if (!canAccessPrivateAlpha(invite)) {
      console.warn('[Google OAuth] User not invited:', email);
      const response = redirectTo('not-invited');
      response.cookies.delete('pap_oauth_state');
      return response;
    }

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: profile.name,
        image: profile.image,
        lastLoginAt: new Date(),
      },
      update: {
        name: profile.name,
        image: profile.image,
        lastLoginAt: new Date(),
      },
    });

    if (invite?.status === 'invited') {
      await prisma.alphaInvite.update({
        where: { email },
        data: { status: 'accepted', acceptedAt: new Date() },
      });
    }

    const expiresAt = typeof tokens.expires_in === 'number'
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    await prisma.googleCredential.upsert({
      where: {
        userId_googleAccountId: {
          userId: user.id,
          googleAccountId: profile.googleAccountId,
        },
      },
      create: {
        userId: user.id,
        googleAccountId: profile.googleAccountId,
        accessTokenEncrypted: encryptSecret(tokens.access_token),
        refreshTokenEncrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
        scope: tokens.scope,
        expiresAt,
      },
      update: {
        accessTokenEncrypted: encryptSecret(tokens.access_token),
        ...(tokens.refresh_token
          ? { refreshTokenEncrypted: encryptSecret(tokens.refresh_token) }
          : {}),
        scope: tokens.scope,
        expiresAt,
        revokedAt: null,
      },
    });

    const response = redirectTo('connected');
    response.cookies.set(papSessionCookieName, createSessionCookieValue({ userId: user.id, email }), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === 'production',
    });
    response.cookies.delete('pap_oauth_state');

    return response;
  } catch (error) {
    console.error('[Google OAuth Callback Error]', error);
    const response = redirectTo('failed');
    response.cookies.delete('pap_oauth_state');
    return response;
  }
}
