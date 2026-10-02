import { ID } from 'appwrite';

/** Generate a short invite token for deep links */
export function createInviteToken(): string {
  return ID.unique().replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
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
    `3. Sign in with email to accept\n\n` +
    `Invite code: ${token}`
  );
}
