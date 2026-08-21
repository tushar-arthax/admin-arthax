/**
 * Every cache key the portal uses, in one place.
 *
 * Mutations write their server response straight into these caches, so a key
 * that is spelled differently in two files means an update lands in a cache
 * nothing is reading and the screen goes stale. Import from here, always.
 */
export const qk = {
  dashboard: ['adminDashboard'] as const,

  tickets: ['adminTickets'] as const,
  ticketMessages: (ticketId: string) => ['adminTicketMessages', ticketId] as const,

  clients: ['onboardedClients'] as const,

  notificationHistory: ['adminNotificationHistory'] as const,

  supportOrgs: (search: string) => ['supportOrgs', search] as const,
  supportTargets: (orgId: string | null) => ['supportTargets', orgId] as const,
  supportSessions: ['supportSessions'] as const,
  supportEvents: (grantId: string | undefined) => ['supportEvents', grantId] as const,
} as const;
