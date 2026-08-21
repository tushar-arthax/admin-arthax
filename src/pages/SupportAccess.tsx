import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  supportAccessApi,
  type SupportGrant,
  type SupportScope,
  type SupportTargetUser,
} from '@/services/api';
import { toast } from 'sonner';
import {
  Building2,
  Clock,
  Eye,
  History,
  Loader2,
  LogIn,
  PenLine,
  Search,
  ShieldAlert,
  Square,
  X,
} from 'lucide-react';

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

function fmt(ts?: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
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

  // Re-render once a minute so the "time left" column stays honest without a
  // refetch — the value is derived from a timestamp we already hold.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const { data: orgs = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['supportOrgs', orgSearch],
    queryFn: () => supportAccessApi.listOrgs(orgSearch || undefined),
  });

  const { data: targets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ['supportTargets', selectedOrgId],
    queryFn: () => supportAccessApi.listTargets(selectedOrgId as string),
    enabled: !!selectedOrgId,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['supportSessions'],
    queryFn: () => supportAccessApi.listSessions({ limit: 50 }),
    refetchInterval: 60_000,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['supportEvents', eventsFor?.id],
    queryFn: () => supportAccessApi.listEvents(eventsFor!.id),
    enabled: !!eventsFor,
  });

  const selectedOrg = useMemo(
    () => orgs.find((o) => o.id === selectedOrgId) || null,
    [orgs, selectedOrgId],
  );

  const openMutation = useMutation({
    mutationFn: supportAccessApi.openSession,
    onSettled: () => qc.invalidateQueries({ queryKey: ['supportSessions'] }),
  });

  const endMutation = useMutation({
    mutationFn: (grantId: string) => supportAccessApi.endSession(grantId),
    onSuccess: () => {
      toast.success('Session ended');
      qc.invalidateQueries({ queryKey: ['supportSessions'] });
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

  const activeSessions = sessions.filter((s) => s.is_active);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Support Access
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Open a scoped, expiring session inside a client's workspace to
            reproduce what they are seeing. No client password is involved, and
            their admins are notified every time.
          </p>
        </div>

        {/* ── Open a session ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-border/40 bg-card/30 p-6 space-y-6">
          <h2 className="font-semibold flex items-center gap-2">
            <LogIn className="w-4 h-4 text-primary" /> Open a session
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Org picker */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                1 · Organisation
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  placeholder="Search clients…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border/40 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="max-h-52 overflow-auto rounded-lg border border-border/40 divide-y divide-border/40 custom-scrollbar">
                {orgsLoading && (
                  <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                  </div>
                )}
                {!orgsLoading && orgs.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">No clients found.</div>
                )}
                {orgs.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => { setSelectedOrgId(o.id); setTargetId(null); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                      selectedOrgId === o.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span className="truncate">{o.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {o.user_count} users
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target picker */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                2 · View as
              </label>
              {!selectedOrgId ? (
                <div className="rounded-lg border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
                  Pick an organisation first.
                </div>
              ) : (
                <div className="max-h-[15.5rem] overflow-auto rounded-lg border border-border/40 divide-y divide-border/40 custom-scrollbar">
                  {targetsLoading && (
                    <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
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
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        targetId === u.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">
                          <span className="font-medium">{u.full_name}</span>
                          <span className="text-muted-foreground"> · {u.email}</span>
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground shrink-0">
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </div>
                      {!u.is_active && (
                        <span className="text-xs text-red-400">deactivated</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scope + reason */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                3 · Access level
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setScope('read')}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    scope === 'read'
                      ? 'border-primary bg-primary/10'
                      : 'border-border/40 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Eye className="w-4 h-4" /> Read only
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Look, don't touch. Covers most tickets.
                  </p>
                </button>
                <button
                  onClick={() => setScope('write')}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    scope === 'write'
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-border/40 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <PenLine className="w-4 h-4" /> Write
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Full authority of that user. Use sparingly.
                  </p>
                </button>
              </div>

              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block pt-2">
                Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMinutes(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      minutes === m
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    {m < 60 ? `${m} min` : `${m / 60}h`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                4 · Why <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. Leads list renders empty for this rep since 18 Aug"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/40 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Shown to the client in their notification and in their own access
                log. Write it for them, not for us.
              </p>
              <input
                value={ticketRef}
                onChange={(e) => setTicketRef(e.target.value)}
                placeholder="Ticket reference (optional)"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border/40 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              {selectedOrg
                ? <>Opening as a member of <span className="text-foreground">{selectedOrg.name}</span>. Their admins are notified immediately.</>
                : 'Their admins are notified immediately.'}
            </p>
            <button
              onClick={handleOpen}
              disabled={!canOpen}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shrink-0"
            >
              {openMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <LogIn className="w-4 h-4" />}
              Open session &amp; launch CRM
            </button>
          </div>
        </div>

        {/* ── Sessions ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden">
          <div className="p-5 border-b border-border/40 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Sessions
            </h2>
            <span className="text-xs text-muted-foreground">
              {activeSessions.length} active · {sessions.length} recent
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/20 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Client</th>
                  <th className="text-left font-medium px-5 py-3">Viewed as</th>
                  <th className="text-left font-medium px-5 py-3">By</th>
                  <th className="text-left font-medium px-5 py-3">Scope</th>
                  <th className="text-left font-medium px-5 py-3">Reason</th>
                  <th className="text-left font-medium px-5 py-3">Started</th>
                  <th className="text-left font-medium px-5 py-3">State</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sessionsLoading && (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
                  </td></tr>
                )}
                {!sessionsLoading && sessions.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-8 text-center text-muted-foreground">
                    No support sessions yet.
                  </td></tr>
                )}
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-5 py-3">{s.org_name || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="truncate max-w-[14rem]">{s.target_email}</div>
                      <div className="text-xs text-muted-foreground">
                        {ROLE_LABEL[s.target_role ?? ''] ?? s.target_role}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground truncate max-w-[12rem]">
                      {s.actor_email}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        s.scope === 'write'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-muted/60 text-muted-foreground'
                      }`}>
                        {s.scope}
                      </span>
                    </td>
                    <td className="px-5 py-3 max-w-[18rem]">
                      <div className="truncate" title={s.reason}>{s.reason}</div>
                      {s.ticket_ref && (
                        <div className="text-xs text-muted-foreground">{s.ticket_ref}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {fmt(s.started_at)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {s.is_active ? (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timeLeft(s.expires_at)}
                        </span>
                      ) : s.revoked_at ? (
                        <span className="text-xs text-muted-foreground">ended</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">expired</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEventsFor(s)}
                          className="text-xs px-2 py-1 rounded-md border border-border/40 hover:bg-muted/40 flex items-center gap-1"
                        >
                          <History className="w-3 h-3" /> {s.request_count}
                        </button>
                        {s.is_active && (
                          <button
                            onClick={() => endMutation.mutate(s.id)}
                            disabled={endMutation.isPending}
                            className="text-xs px-2 py-1 rounded-md border border-red-400/40 text-red-400 hover:bg-red-400/10 flex items-center gap-1 disabled:opacity-40"
                          >
                            <Square className="w-3 h-3" /> End
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Event trail ──────────────────────────────────────────────── */}
      {eventsFor && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setEventsFor(null)}
        >
          <div
            className="bg-card border border-border/40 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border/40 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">Access trail</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {eventsFor.actor_email} as {eventsFor.target_email} · {eventsFor.reason}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Routes only — no record here contains client data.
                </p>
              </div>
              <button
                onClick={() => setEventsFor(null)}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-auto custom-scrollbar p-5">
              {eventsLoading && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              )}
              {!eventsLoading && events.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Nothing was requested during this session.
                </div>
              )}
              {events.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium pb-2">Time</th>
                      <th className="text-left font-medium pb-2">Method</th>
                      <th className="text-left font-medium pb-2">Route</th>
                      <th className="text-right font-medium pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {events.map((e, i) => (
                      <tr key={i}>
                        <td className="py-2 text-muted-foreground whitespace-nowrap pr-4">
                          {fmt(e.occurred_at)}
                        </td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs font-mono ${
                            e.method === 'GET' ? 'text-muted-foreground' : 'text-amber-400'
                          }`}>
                            {e.method}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-xs break-all">{e.route_template}</td>
                        <td className={`py-2 text-right text-xs ${
                          (e.status_code ?? 0) >= 400 ? 'text-red-400' : 'text-muted-foreground'
                        }`}>
                          {e.status_code ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
