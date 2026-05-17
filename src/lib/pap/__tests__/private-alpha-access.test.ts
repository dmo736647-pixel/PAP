import { describe, expect, it } from 'vitest';
import { canAccessPrivateAlpha, normalizeEmail } from '../private-alpha-access';

describe('private alpha access', () => {
  it('normalizes email addresses', () => {
    expect(normalizeEmail('  PERSON@Example.COM  ')).toBe('person@example.com');
  });

  it('allows invited and accepted invites', () => {
    expect(canAccessPrivateAlpha({ status: 'invited' })).toBe(true);
    expect(canAccessPrivateAlpha({ status: 'accepted' })).toBe(true);
  });

  it('rejects revoked and missing invites', () => {
    expect(canAccessPrivateAlpha({ status: 'revoked' })).toBe(false);
    expect(canAccessPrivateAlpha(null)).toBe(false);
  });
});
