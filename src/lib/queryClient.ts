import { QueryCache, QueryClient } from '@tanstack/react-query';
import { syncStore } from './syncStore';
import type { ApiError } from '@/services/api';

/**
 * One client for the whole portal.
 *
 * NOTHING here polls. Screens used to carry their own `refetchInterval`, which
 * meant an open tab hammered the API on a timer whether or not anybody was
 * looking, and still showed stale data for up to a minute after an action. The
 * portal now refreshes on events instead:
 *
 *   - a mutation's own response is written into the cache (see each page), so
 *     the screen reflects what the server just said, immediately;
 *   - the tab coming back into focus, or the network reconnecting, revalidates
 *     what has gone stale;
 *   - the topbar's refresh control revalidates on demand.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Any successful response — a page's own query or a background
    // revalidation — is what "live" means in the topbar.
    onSuccess: () => syncStore.markSynced(),
  }),
  defaultOptions: {
    queries: {
      // Long enough that navigating between pages reuses what is already in
      // hand, short enough that a returning tab pulls fresh data.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
      // A 4xx is an answer, not a blip — retrying it just delays the error.
      retry: (failureCount, error) => {
        const status = (error as unknown as ApiError)?.status ?? 0;
        if (status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      retry: 0,
    },
  },
});
