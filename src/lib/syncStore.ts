/**
 * Last time any query in the app came back from the server.
 *
 * Fed by the QueryCache subscription in `queryClient.ts` — nothing polls it and
 * nothing sets a timer to keep it current; it moves when a response lands. The
 * topbar reads it through `useSyncExternalStore` so the "live" pill is a
 * reflection of real traffic rather than a decoration.
 */
type Listener = () => void;

let lastSyncedAt: number | null = null;
const listeners = new Set<Listener>();

export const syncStore = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): number | null {
    return lastSyncedAt;
  },
  markSynced(at: number = Date.now()) {
    lastSyncedAt = at;
    listeners.forEach((l) => l());
  },
};
