import { useEffect, useState, useSyncExternalStore } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { syncStore } from '@/lib/syncStore';

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

export type SyncState = 'offline' | 'syncing' | 'saving' | 'live';

/**
 * What the topbar pill shows. Every input is an event — a request starting or
 * finishing, the browser going offline — so this never costs a request of its
 * own and never runs a timer against the API.
 */
export function useSyncStatus() {
  const online = useOnlineStatus();
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const lastSyncedAt = useSyncExternalStore(syncStore.subscribe, syncStore.getSnapshot, () => null);

  // Only re-renders the "updated 4m ago" label; purely local clock work.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const state: SyncState = !online
    ? 'offline'
    : mutating > 0
      ? 'saving'
      : fetching > 0
        ? 'syncing'
        : 'live';

  return { state, online, lastSyncedAt, isBusy: fetching > 0 || mutating > 0 };
}
