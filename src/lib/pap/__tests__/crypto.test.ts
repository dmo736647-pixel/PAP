import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from '../crypto';

describe('token crypto', () => {
  const key = Buffer.alloc(32, 7).toString('base64');

  it('encrypts and decrypts a secret', () => {
    const encrypted = encryptSecret('refresh-token-value', key);

    expect(decryptSecret(encrypted, key)).toBe('refresh-token-value');
  });

  it('throws when the key is not 32 bytes', () => {
    expect(() => encryptSecret('secret', Buffer.alloc(31).toString('base64'))).toThrow(
      'PAP_TOKEN_ENCRYPTION_KEY must decode to 32 bytes',
    );
  });
});
