import { describe, expect, it, vi } from 'vitest';
import { createGoogleOAuthUrl, parseGoogleProfile, refreshGoogleAccessToken } from '../google-oauth';

describe('google oauth helpers', () => {
  it('creates an OAuth URL with read-only Gmail and Calendar scopes', () => {
    const url = createGoogleOAuthUrl({
      clientId: 'client-id',
      redirectUri: 'http://localhost:3000/api/auth/google/callback',
      state: 'state-value',
    });

    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/google/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/gmail.readonly');
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/calendar.readonly');
    expect(url.searchParams.get('scope')).toContain('openid');
  });

  it('parses the Google profile payload', () => {
    expect(parseGoogleProfile({
      sub: 'google-user-id',
      email: 'Founder@Example.com',
      email_verified: true,
      name: 'Founder',
      picture: 'https://example.com/avatar.png',
    })).toEqual({
      googleAccountId: 'google-user-id',
      email: 'founder@example.com',
      name: 'Founder',
      image: 'https://example.com/avatar.png',
    });
  });

  it('rejects malformed Google profile payloads', () => {
    expect(() => parseGoogleProfile(null)).toThrow('Google profile is malformed');
    expect(() => parseGoogleProfile({ sub: 123, email: 'founder@example.com', email_verified: true })).toThrow(
      'Google profile is missing sub or email',
    );
  });

  it('rejects Google profiles without a verified email', () => {
    expect(() => parseGoogleProfile({
      sub: 'google-user-id',
      email: 'founder@example.com',
      email_verified: false,
    })).toThrow('Google profile email is not verified');
  });

  it('refreshes an access token with the server-side refresh grant', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'new-access-token',
      expires_in: 3600,
      scope: 'scope',
    }), { status: 200 }));

    await expect(refreshGoogleAccessToken({
      refreshToken: 'refresh-token',
      config: { clientId: 'client-id', clientSecret: 'client-secret', redirectUri: 'http://localhost/callback' },
      fetchImpl: fetchMock,
    })).resolves.toEqual({
      access_token: 'new-access-token',
      expires_in: 3600,
      scope: 'scope',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'content-type': 'application/x-www-form-urlencoded' });
    expect(String(init?.body)).toBe('refresh_token=refresh-token&client_id=client-id&client_secret=client-secret&grant_type=refresh_token');
  });
});
