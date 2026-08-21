import type { SupportGrant } from '@/services/api';

/**
 * A grant the server called active is only live until its own clock runs out.
 *
 * The API answers with `is_active` as it was at the moment of the response;
 * the expiry is a timestamp we already hold. Deriving liveness here means an
 * expiring session goes quiet on screen without anybody asking the server
 * again — and the sidebar counter and the sessions table always agree.
 */
export function isLiveGrant(grant: SupportGrant): boolean {
  if (!grant.is_active) return false;
  if (!grant.expires_at) return true;
  return new Date(grant.expires_at).getTime() > Date.now();
}
