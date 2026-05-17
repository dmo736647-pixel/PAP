import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const tokenKeyError = 'PAP_TOKEN_ENCRYPTION_KEY must decode to 32 bytes';
const malformedSecretError = 'Encrypted secret is malformed';

function decodeTokenKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64');

  if (key.length !== 32) {
    throw new Error(tokenKeyError);
  }

  return key;
}

export function encryptSecret(value: string, base64Key = process.env.PAP_TOKEN_ENCRYPTION_KEY ?? ''): string {
  const key = decodeTokenKey(base64Key);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString('base64')).join('.');
}

export function decryptSecret(value: string, base64Key = process.env.PAP_TOKEN_ENCRYPTION_KEY ?? ''): string {
  const key = decodeTokenKey(base64Key);
  const parts = value.split('.');

  if (parts.length !== 3) {
    throw new Error(malformedSecretError);
  }

  const [ivPart, tagPart, encryptedPart] = parts;
  const iv = Buffer.from(ivPart, 'base64');
  const tag = Buffer.from(tagPart, 'base64');
  const encrypted = Buffer.from(encryptedPart, 'base64');

  if (iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) {
    throw new Error(malformedSecretError);
  }

  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    throw new Error(malformedSecretError);
  }
}
