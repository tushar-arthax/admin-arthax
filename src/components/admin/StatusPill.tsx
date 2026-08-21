import { cn } from '@/lib/utils';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

const TONES: Record<Tone, string> = {
  neutral: 'bg-muted/50 text-muted-foreground border-border/70',
  primary: 'bg-primary/10 text-primary border-primary/25',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  danger: 'bg-red-500/10 text-red-400 border-red-500/25',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  purple: 'bg-violet-500/10 text-violet-400 border-violet-500/25',
};

const DOTS: Record<Tone, string> = {
  neutral: 'bg-zinc-500',
  primary: 'bg-primary',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
  purple: 'bg-violet-400',
};

interface StatusPillProps {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

/** One pill shape for every status in the portal, coloured by tone. */
export function StatusPill({ tone = 'neutral', children, dot = false, pulse = false, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {dot && (
        <span className={cn('relative flex h-1.5 w-1.5 rounded-full', DOTS[tone], pulse && 'ring-pulse')} />
      )}
      {children}
    </span>
  );
}

export const ToneDot = ({ tone = 'neutral', className }: { tone?: Tone; className?: string }) => (
  <span className={cn('h-2 w-2 rounded-full shrink-0', DOTS[tone], className)} />
);
