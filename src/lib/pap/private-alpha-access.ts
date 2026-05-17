import type { PrivateAlphaInviteLike } from './private-alpha-types';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function canAccessPrivateAlpha(invite: PrivateAlphaInviteLike | null): boolean {
  return invite?.status === 'invited' || invite?.status === 'accepted';
}
