import { canUpdate } from '@/lib/permissions';
import type { Session } from '@/lib/session';
import type { Deal } from '@/lib/types';

/**
 * Whether the user can change the deal, and if not, who can. Read from the
 * row's permissions; Appwrite enforces the same rule when the update arrives.
 */
export function dealAccess(deal: Deal, session: Session) {
  if (canUpdate(deal, session.roles)) return { canEdit: true, reason: null };
  const managers = deal.$permissions.includes('update("team:sales/manager")');
  return {
    canEdit: false,
    reason: managers
      ? `Only ${deal.ownerName} and sales managers can update this deal.`
      : `Only ${deal.ownerName} can update this deal.`,
  };
}
