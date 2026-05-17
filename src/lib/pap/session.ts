import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PapSession } from './private-alpha-types';

export const papSessionCookieName = 'pap_session';

const sessionSecretError = 'PAP_SESSION_SECRET must be at least 16 characters';

function requireSessionSecret(secret: string): string {
  if (secret.length < 16) {
    throw new Error(sessionSecretError);
  }

  return secret;
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function isPapSession(value: unknown): value is PapSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PapSession).userId === 'string' &&
    typeof (value as PapSession).email === 'string'
  );
}

export function createSessionCookieValue(
  session: PapSession,
  secret = process.env.PAP_SESSION_SECRET ?? '',
): string {
  const sessionSecret = requireSessionSecret(secret);
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  const signature = sign(payload, sessionSecret);

  return `${payload}.${signature}`;
}

export function parseSessionCookieValue(value: string, secret = process.env.PAP_SESSION_SECRET ?? ''): PapSession | null {
  const sessionSecret = requireSessionSecret(secret);
  const [payload, signature, extra] = value.split('.');

  if (!payload || !signature || extra !== undefined) {
    return null;
  }

  const expectedSignature = sign(payload, sessionSecret);
  const signatureBuffer = Buffer.from(signature, 'base64url');
  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'base64url');

  if (signatureBuffer.length !== expectedSignatureBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedSignatureBuffer)) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));

    return isPapSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
