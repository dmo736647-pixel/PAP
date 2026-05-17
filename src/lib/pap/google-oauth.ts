import { normalizeEmail } from './private-alpha-access';

export const googleOAuthScopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope: string;
  id_token?: string;
};

export type GoogleProfile = {
  googleAccountId: string;
  email: string;
  name?: string;
  image?: string;
};

export function createGoogleOAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): URL {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', googleOAuthScopes.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', input.state);
  return url;
}

export async function exchangeGoogleCodeForTokens(input: {
  code: string;
  config: GoogleOAuthConfig;
  fetchImpl?: typeof fetch;
}): Promise<GoogleTokenResponse> {
  const fetcher = input.fetchImpl ?? fetch;
  const response = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.config.clientId,
      client_secret: input.config.clientSecret,
      redirect_uri: input.config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

export async function fetchGoogleProfile(input: {
  accessToken: string;
  fetchImpl?: typeof fetch;
}): Promise<GoogleProfile> {
  const fetcher = input.fetchImpl ?? fetch;
  const response = await fetcher('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { authorization: `Bearer ${input.accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google profile fetch failed: ${response.status}`);
  }

  return parseGoogleProfile(await response.json());
}

export function parseGoogleProfile(payload: unknown): GoogleProfile {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Google profile is malformed');
  }

  const profile = payload as { sub?: unknown; email?: unknown; email_verified?: unknown; name?: unknown; picture?: unknown };

  if (typeof profile.sub !== 'string' || typeof profile.email !== 'string') {
    throw new Error('Google profile is missing sub or email');
  }

  if (profile.email_verified !== true) {
    throw new Error('Google profile email is not verified');
  }

  return {
    googleAccountId: profile.sub,
    email: normalizeEmail(profile.email),
    name: typeof profile.name === 'string' ? profile.name : undefined,
    image: typeof profile.picture === 'string' ? profile.picture : undefined,
  };
}

export function readGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth environment variables are missing');
  }

  return { clientId, clientSecret, redirectUri };
}
