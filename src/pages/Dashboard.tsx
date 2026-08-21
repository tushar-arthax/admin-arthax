import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, AlertCircle, Building2, CheckCircle2, Gauge, PieChart, TriangleAlert, Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { Panel } from "@/components/admin/Panel";
import { StatCard, StatCardSkeleton } from "@/components/admin/StatCard";
import { StatusPill, Tone } from "@/components/admin/StatusPill";
import { adminAnalyticsApi, type ApiError } from "@/services/api";
import { qk } from "@/lib/queryKeys";
import { compactNumber, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

const RANGES = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
];

const STATUS_TONE: Record<string, Tone> = {
  open: "primary",
  in_progress: "warning",
  waiting_for_client: "purple",
  resolved: "success",
  closed: "neutral",
  reopened: "danger",
};

const ROLE_TONE: Record<string, Tone> = {
  super_admin: "danger",
  admin: "primary",
  team_lead: "info",
  sdr: "purple",
};

/** Percentage change between the last `days` and the `days` before that. */
function periodDelta(series: number[], days: number): number | null {
  if (series.length < days * 2) return null;
  const recent = series.slice(-days).reduce((a, b) => a + b, 0);
  const previous = series.slice(-days * 2, -days).reduce((a, b) => a + b, 0);
  if (previous === 0) return recent === 0 ? 0 : 100;
  return Math.round(((recent - previous) / previous) * 100);
}

interface TooltipPayload {
  dataKey: string;
  name: string;
  value: number;
  stroke: string;
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel px-3 py-2 text-xs shadow-lift">
      <p className="mb-1.5 font-semibold text-foreground">
        {new Date(label).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.stroke }} />
          {p.name}
          <span className="ml-auto pl-3 font-semibold tabular text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/** A labelled row with a proportional bar — used for both breakdown panels. */
function BreakdownRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: Tone }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const barTone: Record<Tone, string> = {
    neutral: "bg-zinc-500", primary: "bg-primary", success: "bg-emerald-500",
    warning: "bg-amber-500", danger: "bg-red-500", info: "bg-blue-500", purple: "bg-violet-500",
  };

  return (
    <div className="group">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="truncate text-[13px] font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-[13px] font-semibold tabular text-muted-foreground">
          {value}
          <span className="ml-1.5 text-[11px] text-muted-foreground/60">{pct}%</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", barTone[tone])}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [rangeDays, setRangeDays] = useState(30);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.dashboard,
    queryFn: adminAnalyticsApi.getDashboard,
  });

  const derived = useMemo(() => {
    const trends = data?.helpdesk?.trends ?? [];
    const opened = trends.map((t) => t.opened);
    const resolved = trends.map((t) => t.resolved);
    const byStatus = data?.helpdesk?.by_status ?? {};

    const pending =
      (byStatus["open"] || 0) + (byStatus["in_progress"] || 0) + (byStatus["reopened"] || 0);
    const closedOut = (byStatus["resolved"] || 0) + (byStatus["closed"] || 0);
    const totalTickets = data?.helpdesk?.total ?? 0;

    const windowed = trends.slice(-rangeDays);
    const openedInRange = windowed.reduce((a, t) => a + t.opened, 0);
    const resolvedInRange = windowed.reduce((a, t) => a + t.resolved, 0);

    return {
      trends,
      windowed,
      opened,
      resolved,
      pending,
      closedOut,
      openedInRange,
      resolvedInRange,
      resolutionRate: totalTickets > 0 ? Math.round((closedOut / totalTickets) * 100) : 0,
      openedDelta: periodDelta(opened, 7),
      resolvedDelta: periodDelta(resolved, 7),
    };
  }, [data, rangeDays]);

  const statusEntries = Object.entries(data?.helpdesk?.by_status ?? {}).sort((a, b) => b[1] - a[1]);
  const roleEntries = Object.entries(data?.users?.by_role ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <AdminLayout>
      <div className="space-y-6 pb-6">
        <PageHeader
          icon={Activity}
          title="System Overview"
          description="Platform-wide health for ArthaX — accounts, workspaces and the support queue, updated as each response lands."
          actions={
            <StatusPill tone={derived.pending > 0 ? "warning" : "success"} dot pulse={derived.pending > 0}>
              {derived.pending > 0 ? `${derived.pending} tickets need attention` : "Queue clear"}
            </StatusPill>
          }
        />

        {isError ? (
          <Panel className="border-red-500/30">
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <TriangleAlert className="h-8 w-8 text-red-400" />
              <div>
                <h3 className="text-sm font-semibold">Could not load platform metrics</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(error as unknown as ApiError)?.detail || "The analytics endpoint did not respond."}
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="rounded-lg border border-border/70 px-4 py-2 text-xs font-semibold transition-colors hover:border-primary/40 hover:text-primary"
              >
                Try again
              </button>
            </div>
          </Panel>
        ) : (
          <>
            {/* ── KPI row ─────────────────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {isLoading || !data ? (
                [0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} index={i} />)
              ) : (
                <>
                  <StatCard
                    index={0}
                    label="Total Users"
                    value={compactNumber(data.users.total)}
                    icon={Users}
                    tone="info"
                    hint={`${roleEntries.length} distinct roles in use`}
                  />
                  <StatCard
                    index={1}
                    label="Organizations"
                    value={compactNumber(data.organizations.total)}
                    icon={Building2}
                    tone="purple"
                    hint={
                      data.organizations.total > 0
                        ? `~${Math.round(data.users.total / data.organizations.total)} users per workspace`
                        : "No workspaces yet"
                    }
                  />
                  <StatCard
                    index={2}
                    label="Open Tickets"
                    value={compactNumber(derived.pending)}
                    icon={AlertCircle}
                    tone="warning"
                    delta={derived.openedDelta}
                    invertDelta
                    hint="Open, in progress and reopened"
                    series={derived.opened}
                  />
                  <StatCard
                    index={3}
                    label="Resolved Tickets"
                    value={compactNumber(derived.closedOut)}
                    icon={CheckCircle2}
                    tone="success"
                    delta={derived.resolvedDelta}
                    hint={`${derived.resolutionRate}% of all tickets closed out`}
                    series={derived.resolved}
                  />
                </>
              )}
            </div>

            {/* ── Chart + breakdowns ──────────────────────────────────── */}
            <div className="grid gap-6 xl:grid-cols-3">
              <Panel
                className="xl:col-span-2"
                title="Ticket velocity"
                icon={Activity}
                actions={
                  <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-surface-2/50 p-0.5">
                    {RANGES.map((r) => (
                      <button
                        key={r.days}
                        onClick={() => setRangeDays(r.days)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                          rangeDays === r.days
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="mb-5 flex flex-wrap items-center gap-x-8 gap-y-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Opened
                    </p>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-bold tabular text-foreground">{derived.openedInRange}</span>
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Resolved
                    </p>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-bold tabular text-foreground">{derived.resolvedInRange}</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Net change
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-2xl font-bold tabular",
                        derived.openedInRange - derived.resolvedInRange > 0 ? "text-amber-400" : "text-emerald-400",
                      )}
                    >
                      {derived.openedInRange - derived.resolvedInRange > 0 ? "+" : ""}
                      {derived.openedInRange - derived.resolvedInRange}
                    </p>
                  </div>
                </div>

                <div className="h-[300px] w-full">
                  {isLoading ? (
                    <div className="shimmer h-full w-full rounded-xl bg-muted/20" />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={derived.windowed} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id="dashOpened" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.32} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="dashResolved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.32} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.05)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#52525b"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={24}
                          tickFormatter={(val) =>
                            new Date(val).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                          }
                        />
                        <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={46} />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(0 0% 100% / 0.12)" }} />
                        <Area
                          type="monotone" dataKey="opened" name="Opened" stroke="#f59e0b"
                          fill="url(#dashOpened)" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                        />
                        <Area
                          type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e"
                          fill="url(#dashResolved)" strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Panel>

              <div className="space-y-6">
                <Panel title="Resolution rate" icon={Gauge}>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-4xl font-bold tabular text-foreground">{derived.resolutionRate}%</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {derived.closedOut} of {data?.helpdesk?.total ?? 0} tickets closed out
                      </p>
                    </div>
                    <StatusPill tone={derived.resolutionRate >= 70 ? "success" : derived.resolutionRate >= 40 ? "warning" : "danger"}>
                      {derived.resolutionRate >= 70 ? "Healthy" : derived.resolutionRate >= 40 ? "Watch" : "At risk"}
                    </StatusPill>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary transition-[width] duration-700 ease-out"
                      style={{ width: `${Math.max(derived.resolutionRate, 2)}%` }}
                    />
                  </div>
                </Panel>

                <Panel title="Users by role" icon={Users}>
                  <div className="space-y-4">
                    {roleEntries.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">No users yet.</p>
                    ) : (
                      roleEntries.map(([role, count]) => (
                        <BreakdownRow
                          key={role}
                          label={titleCase(role)}
                          value={count}
                          total={data?.users?.total ?? 0}
                          tone={ROLE_TONE[role] ?? "neutral"}
                        />
                      ))
                    )}
                  </div>
                </Panel>

                <Panel title="Tickets by status" icon={PieChart}>
                  <div className="space-y-4">
                    {statusEntries.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">No tickets raised yet.</p>
                    ) : (
                      statusEntries.map(([status, count]) => (
                        <BreakdownRow
                          key={status}
                          label={titleCase(status)}
                          value={count}
                          total={data?.helpdesk?.total ?? 0}
                          tone={STATUS_TONE[status] ?? "neutral"}
                        />
                      ))
                    )}
                  </div>
                </Panel>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
