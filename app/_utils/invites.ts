import { ID } from 'appwrite';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** High-entropy invite token (hard to brute-force) */
export function createInviteToken(): string {
  const raw = `${ID.unique()}${ID.unique()}`.replace(/[^a-zA-Z0-9]/g, '');
  return raw.slice(0, 32);
}

export function inviteExpiresAt(from: Date = new Date()): string {
  return new Date(from.getTime() + INVITE_TTL_MS).toISOString();
}

export function isInviteExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return false;
  return Date.now() > t;
}

/**
 * Deep link for accepting a caregiver invite.
 * Scheme matches app.json (`myapp`).
 */
export function buildInviteUrl(token: string): string {
  return `myapp://invite?token=${encodeURIComponent(token)}`;
}

/** Human-readable share text for SMS/email/share sheet */
export function buildInviteShareMessage(token: string, patientLabel?: string): string {
  const who = patientLabel ? `${patientLabel}'s` : 'a';
  const url = buildInviteUrl(token);
  return (
    `You've been invited to help with ${who} medications on MedRem.\n\n` +
    `1. Install / open MedRem\n` +
    `2. Open this link: ${url}\n` +
    `3. Sign in with the invited email to accept\n\n` +
    `Invite code: ${token}\n` +
    `This invite expires in 7 days.`
  );
}
