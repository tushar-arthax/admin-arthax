import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Clock, Eye, History, Loader2, LogIn, PenLine, Search, ShieldAlert,
  Square, Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { Panel } from '@/components/admin/Panel';
import { EmptyState } from '@/components/admin/EmptyState';
import { StatusPill } from '@/components/admin/StatusPill';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  supportAccessApi,
  type SupportGrant,
  type SupportScope,
  type SupportTargetUser,
} from '@/services/api';
import { qk } from '@/lib/queryKeys';
import { dateTime } from '@/lib/format';
import { isLiveGrant } from '@/lib/grants';
import { cn } from '@/lib/utils';

// Where the CRM lives. The launch handoff hands it a short-lived token, so this
// has to point at the same deployment the token was minted for.
const CRM_URL = import.meta.env.VITE_CRM_URL || 'http://localhost:8080';

const DURATIONS = [15, 30, 60, 120, 240];

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  team_lead: 'Team Lead',
  sdr: 'SDR',
};

function timeLeft(expiresAt?: string | null): string {
  if (!expiresAt) return '—';
  // Backend timestamps are naive IST wall-clock. Comparing them to a UTC-based
  // `Date.now()` would be off by the offset, so both sides are read as local.
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
}

/** Numbered step heading used by the four panels of the open-session form. */
function Step({ n, label, hint }: { n: number; label: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-[10px] font-bold text-primary">
        {n}
      </span>
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-foreground">{label}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

export default function SupportAccess() {
  const qc = useQueryClient();

  const [orgSearch, setOrgSearch] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [scope, setScope] = useState<SupportScope>('read');
  const [reason, setReason] = useState('');
  const [ticketRef, setTicketRef] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [eventsFor, setEventsFor] = useState<SupportGrant | null>(null);

  // Re-render every half minute so the "time left" column stays honest without
  // a refetch — the value is derived from a timestamp we already hold, so this
  // costs nothing on the wire.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: qk.supportOrgs(orgSearch),
    queryFn: () => supportAccessApi.listOrgs(orgSearch || undefined),
  });

  const { data: targets = [], isLoading: targetsLoading } = useQuery({
    queryKey: qk.supportTargets(selectedOrgId),
    queryFn: () => supportAccessApi.listTargets(selectedOrgId as string),
    enabled: !!selectedOrgId,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: qk.supportSessions,
    queryFn: () => supportAccessApi.listSessions({ limit: 50 }),
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: qk.supportEvents(eventsFor?.id),
    queryFn: () => supportAccessApi.listEvents(eventsFor!.id),
    enabled: !!eventsFor,
  });

  const selectedOrg = useMemo(
    () => orgs.find((o) => o.id === selectedOrgId) || null,
    [orgs, selectedOrgId],
  );

  const openMutation = useMutation({
    mutationFn: supportAccessApi.openSession,
  });

  const endMutation = useMutation({
    mutationFn: (grantId: string) => supportAccessApi.endSession(grantId),
    // The endpoint answers with the grant as it now stands, so the row is
    // rewritten from that answer rather than re-fetching the whole list.
    onSuccess: (ended) => {
      toast.success('Session ended');
      qc.setQueryData<SupportGrant[]>(qk.supportSessions, (curr = []) =>
        curr.map((s) => (s.id === ended.id ? ended : s)),
      );
    },
    onError: (err: any) => toast.error(err.detail || 'Could not end session'),
  });

  const canOpen = !!targetId && reason.trim().length >= 3 && !openMutation.isPending;

  const handleOpen = () => {
    if (!canOpen) return;
    if (scope === 'write') {
      const target = targets.find((t) => t.id === targetId);
      const ok = window.confirm(
        `Open a WRITE session as ${target?.email}?\n\n` +
        `Anything you do will be performed as this user, with their full ` +
        `permissions. That includes actions that reach their customers — ` +
        `sending content fires a real WhatsApp or email and cannot be undone.\n\n` +
        `The client's admins are notified either way.`,
      );
      if (!ok) return;
    }
    // Open the tab NOW, synchronously, while the click is still the reason
    // anything is happening. Calling window.open after awaiting the mint is
    // what gets it swallowed by the pop-up blocker: by then the browser no
    // longer attributes the call to a user gesture. The tab is parked on a
    // holding page and pointed at the CRM once the token exists.
    //
    // `noopener` is omitted deliberately — it makes window.open return null,
    // and the handle is the whole point here. `tab.opener` is cleared below
    // instead, once the destination is set.
    const tab = window.open('', '_blank');
    if (tab) {
      tab.document.write(
        '<title>Opening support session…</title>' +
        '<body style="font:14px system-ui;background:#0b0b0b;color:#888;' +
        'display:flex;align-items:center;justify-content:center;height:100vh">' +
        'Opening support session…</body>',
      );
    }

    openMutation.mutate(
      {
        target_user_id: targetId as string,
        scope,
        reason: reason.trim(),
        ticket_ref: ticketRef.trim() || null,
        minutes,
      },
      {
        onSuccess: (res) => {
          toast.success(`Session open as ${res.grant.target_email}`);

          // The grant comes back whole, so the table shows the new session
          // immediately — no refetch stands between opening it and seeing it.
          qc.setQueryData<SupportGrant[]>(qk.supportSessions, (curr = []) => [
            res.grant,
            ...curr.filter((s) => s.id !== res.grant.id),
          ]);

          // The token rides in the fragment, which browsers never send to the
          // server — so it stays out of access logs and Referer headers.
          const url =
            `${CRM_URL}/support-session#token=${encodeURIComponent(res.access_token)}`;

          if (tab) {
            tab.opener = null;
            tab.location.replace(url);
          } else {
            // Blocked anyway. The grant is already open and recorded, so give
            // a way in rather than stranding it.
            toast.error('Pop-up blocked — allow pop-ups for this site.', {
              action: { label: 'Open CRM', onClick: () => window.open(url, '_blank') },
              duration: 30_000,
            });
          }

          setReason('');
          setTicketRef('');
          setTargetId(null);
        },
        onError: (err: any) => {
          // Nothing was granted, so leave no orphan tab behind.
          tab?.close();
          toast.error(err?.detail || 'Could not open session');
        },
      },
    );
  };

  const activeSessions = sessions.filter(isLiveGrant);
  const selectedTarget = targets.find((t) => t.id === targetId) || null;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-6">
        <PageHeader
          icon={ShieldAlert}
          title="Support Access"
          description="Open a scoped, expiring session inside a client's workspace to reproduce what they are seeing. No client password is involved, and their admins are notified every time."
          actions={
            <StatusPill tone={activeSessions.length > 0 ? 'warning' : 'neutral'} dot pulse={activeSessions.length > 0}>
              {activeSessions.length} live session{activeSessions.length === 1 ? '' : 's'}
            </StatusPill>
          }
        />

        {/* ── Open a session ─────────────────────────────────────────── */}
        <Panel title="Open a session" icon={LogIn}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Org picker */}
            <div>
              <Step n={1} label="Organisation" />
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder="Search clients…"
                  className="field h-9 py-0 pl-9 text-[13px]"
                />
              </div>
              <div className="custom-scrollbar max-h-52 divide-y divide-border/40 overflow-auto rounded-xl border border-border/60 bg-background/30">
                {orgsLoading && (
                  <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                )}
                {!orgsLoading && orgs.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">No clients found.</div>
                )}
                {orgs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => { setSelectedOrgId(o.id); setTargetId(null); }}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors',
                      selectedOrgId === o.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{o.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" /> {o.user_count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target picker */}
            <div>
              <Step n={2} label="View as" />
              {!selectedOrgId ? (
                <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                  Pick an organisation first.
                </div>
              ) : (
                <div className="custom-scrollbar max-h-[15.5rem] divide-y divide-border/40 overflow-auto rounded-xl border border-border/60 bg-background/30">
                  {targetsLoading && (
                    <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  )}
                  {!targetsLoading && targets.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground">
                      This organisation has no users to view as.
                    </div>
                  )}
                  {targets.map((u: SupportTargetUser) => (
                    <button
                      key={u.id}
                      disabled={!u.is_active}
                      onClick={() => setTargetId(u.id)}
                      className={cn(
                        'w-full px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                        targetId === u.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40',
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">
                          <span className="font-medium">{u.full_name}</span>
                          <span className="text-muted-foreground"> · {u.email}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </div>
                      {!u.is_active && <span className="text-xs text-red-400">deactivated</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Scope + duration */}
            <div>
              <Step n={3} label="Access level" />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setScope('read')}
                  className={cn(
                    'rounded-xl border p-3.5 text-left transition-all',
                    scope === 'read'
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border/60 hover:border-border hover:bg-muted/30',
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Eye className="h-4 w-4" /> Read only
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Look, don't touch. Covers most tickets.
                  </p>
                </button>
                <button
                  onClick={() => setScope('write')}
                  className={cn(
                    'rounded-xl border p-3.5 text-left transition-all',
                    scope === 'write'
                      ? 'border-amber-500/60 bg-amber-500/10'
                      : 'border-border/60 hover:border-border hover:bg-muted/30',
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <PenLine className="h-4 w-4" /> Write
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Full authority of that user. Use sparingly.
                  </p>
                </button>
              </div>

              <div className="mt-5">
                <Step n={4} label="Duration" hint="the session dies on its own" />
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMinutes(m)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                        minutes === m
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-border/60 text-muted-foreground hover:bg-muted/40',
                      )}
                    >
                      {m < 60 ? `${m} min` : `${m / 60}h`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <Step n={5} label="Why" hint="required" />
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. Leads list renders empty for this rep since 18 Aug"
                className="field resize-none"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Shown to the client in their notification and in their own access
                log. Write it for them, not for us.
              </p>
              <input
                value={ticketRef}
                onChange={(e) => setTicketRef(e.target.value)}
                placeholder="Ticket reference (optional)"
                className="field mt-3"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/50 pt-5">
            <p className="text-xs text-muted-foreground">
              {selectedTarget ? (
                <>
                  Opening as <span className="font-medium text-foreground">{selectedTarget.email}</span>
                  {selectedOrg && <> at <span className="font-medium text-foreground">{selectedOrg.name}</span></>}
                  {' '}· <span className={scope === 'write' ? 'text-amber-400' : 'text-foreground'}>{scope}</span> access for {minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hours`}. Their admins are notified immediately.
                </>
              ) : (
                'Pick an organisation and a user. Their admins are notified immediately.'
              )}
            </p>
            <button
              onClick={handleOpen}
              disabled={!canOpen}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40"
            >
              {openMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Open session &amp; launch CRM
            </button>
          </div>
        </Panel>

        {/* ── Sessions ───────────────────────────────────────────────── */}
        <Panel
          flush
          title="Sessions"
          icon={History}
          actions={
            <span className="text-xs text-muted-foreground">
              {activeSessions.length} active · {sessions.length} recent
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50 bg-surface-2/40 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 text-left">Client</th>
                  <th className="px-5 py-3.5 text-left">Viewed as</th>
                  <th className="px-5 py-3.5 text-left">By</th>
                  <th className="px-5 py-3.5 text-left">Scope</th>
                  <th className="px-5 py-3.5 text-left">Reason</th>
                  <th className="px-5 py-3.5 text-left">Started</th>
                  <th className="px-5 py-3.5 text-left">State</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sessionsLoading && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
                    </td>
                  </tr>
                )}
                {!sessionsLoading && sessions.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState
                        icon={ShieldAlert}
                        title="No support sessions yet"
                        description="Every session opened from this screen is recorded here, with the routes it touched."
                      />
                    </td>
                  </tr>
                )}
                {sessions.map((s) => {
                  const live = isLiveGrant(s);
                  return (
                    <tr key={s.id} className={cn('transition-colors hover:bg-muted/20', live && 'bg-primary/[0.03]')}>
                      <td className="px-5 py-3.5 font-medium">{s.org_name || '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="max-w-[14rem] truncate">{s.target_email}</div>
                        <div className="text-xs text-muted-foreground">
                          {ROLE_LABEL[s.target_role ?? ''] ?? s.target_role}
                        </div>
                      </td>
                      <td className="max-w-[12rem] truncate px-5 py-3.5 text-muted-foreground">
                        {s.actor_email}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill tone={s.scope === 'write' ? 'warning' : 'neutral'}>{s.scope}</StatusPill>
                      </td>
                      <td className="max-w-[18rem] px-5 py-3.5">
                        <div className="truncate" title={s.reason}>{s.reason}</div>
                        {s.ticket_ref && (
                          <div className="text-xs text-muted-foreground">{s.ticket_ref}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                        {dateTime(s.started_at)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        {live ? (
                          <StatusPill tone="success" dot pulse>
                            <Clock className="h-2.5 w-2.5" /> {timeLeft(s.expires_at)}
                          </StatusPill>
                        ) : s.revoked_at ? (
                          <span className="text-xs text-muted-foreground">ended</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">expired</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEventsFor(s)}
                            className="flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs transition-colors hover:border-primary/40 hover:text-primary"
                          >
                            <History className="h-3 w-3" /> {s.request_count}
                          </button>
                          {live && (
                            <button
                              onClick={() => endMutation.mutate(s.id)}
                              disabled={endMutation.isPending && endMutation.variables === s.id}
                              className="flex items-center gap-1 rounded-md border border-red-400/40 px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-400/10 disabled:opacity-40"
                            >
                              {endMutation.isPending && endMutation.variables === s.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Square className="h-3 w-3" />
                              )}
                              End
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* ── Event trail ──────────────────────────────────────────────── */}
      <Dialog open={!!eventsFor} onOpenChange={(open) => !open && setEventsFor(null)}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-hidden border-border/60 bg-card p-0">
          <DialogHeader className="border-b border-border/50 p-5">
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" /> Access trail
            </DialogTitle>
            <DialogDescription className="text-xs">
              {eventsFor?.actor_email} as {eventsFor?.target_email} · {eventsFor?.reason}
              <br />
              Routes only — no record here contains client data.
            </DialogDescription>
          </DialogHeader>

          <div className="custom-scrollbar max-h-[55vh] overflow-auto p-5">
            {eventsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            )}
            {!eventsLoading && events.length === 0 && (
              <div className="text-sm text-muted-foreground">
                Nothing was requested during this session.
              </div>
            )}
            {events.length > 0 && (
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <tr>
                    <th className="pb-2 text-left font-bold">Time</th>
                    <th className="pb-2 text-left font-bold">Method</th>
                    <th className="pb-2 text-left font-bold">Route</th>
                    <th className="pb-2 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {events.map((e, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap py-2 pr-4 text-muted-foreground">
                        {dateTime(e.occurred_at)}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={cn(
                            'font-mono text-xs',
                            e.method === 'GET' ? 'text-muted-foreground' : 'text-amber-400',
                          )}
                        >
                          {e.method}
                        </span>
                      </td>
                      <td className="break-all py-2 font-mono text-xs">{e.route_template}</td>
                      <td
                        className={cn(
                          'py-2 text-right text-xs',
                          (e.status_code ?? 0) >= 400 ? 'text-red-400' : 'text-muted-foreground',
                        )}
                      >
                        {e.status_code ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
