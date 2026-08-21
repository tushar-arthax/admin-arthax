import { LucideIcon, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Tone } from './StatusPill';

/** Hex per tone, because recharts needs a colour string, not a class. */
const HEX: Record<Tone, string> = {
  neutral: '#a1a1aa',
  primary: '#ccff00',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
};

const ICON_TONE: Record<Tone, string> = {
  neutral: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/20',
  primary: 'text-primary bg-primary/10 border-primary/20',
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  danger: 'text-red-400 bg-red-500/10 border-red-500/20',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  purple: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
};

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  hint?: string;
  /** Percentage change vs the previous period. Null hides the chip. */
  delta?: number | null;
  /** Higher is worse for this metric — flips the delta colouring. */
  invertDelta?: boolean;
  series?: number[];
  index?: number;
}

export function StatCard({
  label, value, icon: Icon, tone = 'primary', hint, delta = null, invertDelta = false, series, index = 0,
}: StatCardProps) {
  const chartData = (series ?? []).map((v, i) => ({ i, v }));
  const gradientId = `spark-${label.replace(/\W+/g, '')}-${index}`;
  const good = delta === null ? null : invertDelta ? delta <= 0 : delta >= 0;
  const DeltaIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;

  return (
    <article
      className="panel panel-interactive group relative animate-rise overflow-hidden"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="relative z-10 p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105',
              ICON_TONE[tone],
            )}
          >
            <Icon className="h-[1.15rem] w-[1.15rem]" />
          </div>

          {delta !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular',
                good === null || delta === 0
                  ? 'border-border/70 bg-muted/40 text-muted-foreground'
                  : good
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500/25 bg-red-500/10 text-red-400',
              )}
            >
              <DeltaIcon className="h-3 w-3" />
              {delta > 0 ? '+' : ''}{delta}%
            </span>
          )}
        </div>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-[1.75rem] font-bold leading-none tabular text-foreground">{value}</p>
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </div>

      {chartData.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 opacity-60 transition-opacity duration-300 group-hover:opacity-100">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={HEX[tone]} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={HEX[tone]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={HEX[tone]}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  );
}

export function StatCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div className="panel shimmer h-[9.5rem] animate-rise p-5" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="h-10 w-10 rounded-xl bg-muted/50" />
      <div className="mt-4 h-3 w-24 rounded bg-muted/40" />
      <div className="mt-3 h-7 w-16 rounded bg-muted/50" />
    </div>
  );
}
