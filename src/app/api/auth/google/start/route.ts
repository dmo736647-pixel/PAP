import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createGoogleOAuthUrl, readGoogleOAuthConfig } from '@/lib/pap/google-oauth';

export async function GET() {
  const state = randomBytes(32).toString('base64url');
  const config = readGoogleOAuthConfig();
  const url = createGoogleOAuthUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    state,
  });
  const response = NextResponse.redirect(url);

  response.cookies.set('pap_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
