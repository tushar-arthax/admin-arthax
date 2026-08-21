import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Live state of the connection to the API.
 *
 * The dot is not decoration: it turns on when a response lands, shows amber
 * while a write is in flight, and goes red the moment the browser reports it is
 * offline. The refresh control revalidates only what is on screen.
 */
export function SyncIndicator({ compact = false }: { compact?: boolean }) {
  const qc = useQueryClient();
  const { state, lastSyncedAt, isBusy } = useSyncStatus();

  const copy = {
    offline: { label: 'Offline', dot: 'bg-red-500', text: 'text-red-400' },
    saving: { label: 'Saving', dot: 'bg-amber-400', text: 'text-amber-400' },
    syncing: { label: 'Syncing', dot: 'bg-primary', text: 'text-primary' },
    live: { label: 'Live', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  }[state];

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border border-border/70 bg-surface-2/60 py-1.5 pl-2.5 pr-3',
              'text-[11px] font-medium transition-colors',
            )}
          >
            {state === 'offline' ? (
              <WifiOff className="h-3 w-3 text-red-400" />
            ) : (
              <span className={cn('relative flex h-1.5 w-1.5 rounded-full', copy.dot, copy.text, state === 'live' && 'ring-pulse')} />
            )}
            <span className={copy.text}>{copy.label}</span>
            {!compact && lastSyncedAt && state === 'live' && (
              <span className="text-muted-foreground">· {relativeTime(lastSyncedAt)}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[15rem] text-xs">
          {state === 'offline'
            ? 'No network. The portal will catch up on its own the moment the connection is back.'
            : 'Screens update from each response as it arrives and revalidate when this tab regains focus. Nothing is polled on a timer.'}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => qc.refetchQueries({ type: 'active' })}
            disabled={isBusy}
            aria-label="Refresh data"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-surface-2/60 text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isBusy && 'animate-spin')} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Refresh this screen</TooltipContent>
      </Tooltip>
    </div>
  );
}
