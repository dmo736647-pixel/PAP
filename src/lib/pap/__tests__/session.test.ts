import { describe, expect, it } from 'vitest';
import { createSessionCookieValue, parseSessionCookieValue } from '../session';

describe('PAP session cookie helpers', () => {
  const secret = 'a-session-secret-with-length';

  it('creates and parses a session cookie value', () => {
    const session = { userId: 'user-1', email: 'person@example.com' };
    const cookie = createSessionCookieValue(session, secret);

    expect(parseSessionCookieValue(cookie, secret)).toEqual(session);
  });

  it('returns null for a tampered cookie value', () => {
    const cookie = createSessionCookieValue({ userId: 'user-1', email: 'person@example.com' }, secret);
    const tampered = cookie.replace(/.$/, cookie.endsWith('a') ? 'b' : 'a');

    expect(parseSessionCookieValue(tampered, secret)).toBeNull();
  });
});
