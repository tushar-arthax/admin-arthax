/**
 * IVR / TeleCMI — every client's calling integration, for ArthaX staff.
 *
 * HOW A CLIENT IS ONBOARDED
 *   1. In ArthaX's TeleCMI account, create an app for the client (Add
 *      Services): it gets a number, an App ID and an App Secret.
 *   2. In that app's Settings → Developer → Webhooks, paste the ONE webhook URL
 *      shown on this page. It is the same for every client.
 *   3. Send the client admin the App ID and Secret. They connect them in the
 *      CRM under Calling / IVR and set up the rest themselves.
 *
 * From then on the client shows up in the table below, with its health and
 * usage, and can be switched off from here.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, AlertTriangle, CheckCircle2, Copy, Loader2, Phone, PhoneCall, Power, RefreshCw, Unplug, Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { Panel } from '@/components/admin/Panel';
import { EmptyState } from '@/components/admin/EmptyState';
import { StatCard } from '@/components/admin/StatCard';
import { StatusPill, type Tone } from '@/components/admin/StatusPill';
import { ivrApi, type IvrClientRow, type IvrMonitor } from '@/services/api';
import { qk } from '@/lib/queryKeys';
import { dateTime, relativeTime } from '@/lib/format';

function errorDetail(error: unknown, fallback: string): string {
  const detail = (error as { detail?: unknown })?.detail;
  return typeof detail === 'string' && detail ? detail : fallback;
}

/** One verdict per client, worst first: what staff need to act on. */
function health(row: IvrClientRow): { tone: Tone; label: string } {
  if (row.verify_error) return { tone: 'danger', label: 'Secret rejected' };
  if (!row.ready) return { tone: 'warning', label: 'Setup incomplete' };
  if (!row.is_enabled) return { tone: 'neutral', label: 'Off' };
  if (row.failures_7d > 0) return { tone: 'warning', label: 'Live · issues' };
  return { tone: 'success', label: 'Live' };
}

export default function IvrCalling() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: qk.ivrMonitor, queryFn: ivrApi.monitor, refetchInterval: 30_000 });
  const orgs = data?.orgs ?? [];

  const store = (next: IvrMonitor) => qc.setQueryData(qk.ivrMonitor, next);

  const refresh = useMutation({
    mutationFn: (orgId: string) => ivrApi.refresh(orgId),
    onSuccess: (next, orgId) => {
      store(next);
      const row = next.orgs.find((o) => o.org_id === orgId);
      if (row?.verify_error) toast.error(`${row.org_name}: TeleCMI rejected the saved secret.`);
      else toast.success(`${row?.org_name ?? 'Client'} checked with TeleCMI.`);
    },
    onError: (e) => toast.error(errorDetail(e, 'Could not reach TeleCMI.')),
  });

  const toggle = useMutation({
    mutationFn: ({ orgId, enabled }: { orgId: string; enabled: boolean }) => ivrApi.setEnabled(orgId, enabled),
    onSuccess: (next, { enabled }) => {
      store(next);
      toast.success(enabled ? 'IVR switched on for this client.' : 'IVR switched off. Their reps are back on phone calling.');
    },
    onError: (e) => toast.error(errorDetail(e, 'IVR could not be switched.')),
  });

  const release = useMutation({
    mutationFn: (orgId: string) => ivrApi.disconnect(orgId),
    onSuccess: (next) => {
      store(next);
      toast.success('TeleCMI app released. It can now be connected by another organisation.');
    },
    onError: (e) => toast.error(errorDetail(e, 'The app could not be disconnected.')),
  });

  const confirmRelease = (row: IvrClientRow) => {
    if (window.confirm(
      `Disconnect TeleCMI app ${row.app_id} from ${row.org_name}? Their reps go back to phone calling. `
      + 'Past calls, recordings and transcripts are kept.',
    )) release.mutate(row.org_id);
  };

  const live = orgs.filter((o) => o.is_enabled).length;
  const calls = orgs.reduce((sum, o) => sum + o.calls_7d, 0);
  const liveNow = orgs.reduce((sum, o) => sum + o.live_now, 0);

  return (
    <AdminLayout>
      <div className="space-y-6 pb-6">
        <PageHeader
          icon={PhoneCall}
          title="IVR / TeleCMI"
          description="Every client calling through TeleCMI: whether their connection works, how much they use it, and whether call reports are arriving. Clients connect the app you create for them; you watch it here."
          actions={
            <StatusPill tone={data?.webhook_configured ? 'success' : 'danger'} dot>
              {data?.webhook_configured ? 'Webhook ready' : 'Webhook not configured'}
            </StatusPill>
          }
        />

        {/* ── Onboarding a client ─────────────────────────────────────── */}
        <Panel title="Onboard a client to IVR" icon={Phone}>
          <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>In ArthaX's TeleCMI account, click <span className="font-semibold text-foreground">Add Services</span> to create an app for the client and assign it a number.</li>
            <li>Open that app's <span className="font-semibold text-foreground">Settings → Developer → Webhooks</span>, add the URL below (method POST) for call reports and live events, and turn call recording on.</li>
            <li>From <span className="font-semibold text-foreground">Developer → App Secret</span>, send the client admin the App ID and Secret. They connect them in the CRM under <span className="font-semibold text-foreground">Calling / IVR</span>.</li>
          </ol>
          {data?.webhook_url ? (
            <div className="flex gap-2">
              <input
                readOnly
                value={data.webhook_url}
                onFocus={(e) => e.target.select()}
                className="h-10 flex-1 rounded-lg border border-border bg-surface-2/40 px-3 font-mono text-xs text-foreground outline-none"
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(data.webhook_url!).then(() => toast.success('Webhook URL copied.'))}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-surface-2"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              The webhook URL is not set up on the server. Set TELECMI_WEBHOOK_TOKEN (a long random string) and
              PUBLIC_API_BASE_URL in the backend environment and restart it. Until then no call reports, recordings or
              transcripts reach ArthaX.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Keep this URL private. It is the same for every client; ArthaX works out whose call it is from the App ID.
          </p>
        </Panel>

        {/* ── Totals ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard index={0} label="Clients connected" value={orgs.length} icon={Users} tone="primary" />
          <StatCard index={1} label="IVR switched on" value={live} icon={Power} tone="success" />
          <StatCard index={2} label="IVR calls, last 7 days" value={calls} icon={PhoneCall} tone="info" />
          <StatCard index={3} label="On a call right now" value={liveNow} icon={Activity} tone="purple" />
        </div>

        {/* ── Clients ────────────────────────────────────────────────── */}
        <Panel title="Clients" icon={PhoneCall} flush>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50 bg-surface-2/40 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 text-left">Client</th>
                  <th className="px-5 py-3.5 text-left">State</th>
                  <th className="px-5 py-3.5 text-left">Numbers</th>
                  <th className="px-5 py-3.5 text-right">IVR reps</th>
                  <th className="px-5 py-3.5 text-right">Calls · 7d</th>
                  <th className="px-5 py-3.5 text-right">Talk min</th>
                  <th className="px-5 py-3.5 text-left">Last call report</th>
                  <th className="px-5 py-3.5 text-left">Connection</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading && (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && orgs.length === 0 && (
                  <tr>
                    <td colSpan={9}>
                      <EmptyState
                        icon={PhoneCall}
                        title="No client has connected TeleCMI yet"
                        description="Create an app for a client in TeleCMI and send them its App ID and Secret. They appear here once they connect it."
                      />
                    </td>
                  </tr>
                )}
                {orgs.map((row) => {
                  const verdict = health(row);
                  const busy = (refresh.isPending && refresh.variables === row.org_id)
                    || (toggle.isPending && toggle.variables?.orgId === row.org_id)
                    || (release.isPending && release.variables === row.org_id);
                  return (
                    <tr key={row.org_id} className="align-top">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-foreground">{row.org_name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">App {row.app_id} · {row.region}</p>
                        <p className="text-[11px] text-muted-foreground">Connected {dateTime(row.connected_at)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill tone={verdict.tone} dot pulse={verdict.tone === 'success' && row.live_now > 0}>
                          {verdict.label}
                        </StatusPill>
                        {row.live_now > 0 && (
                          <p className="mt-1.5 text-[11px] text-muted-foreground">{row.live_now} on a call now</p>
                        )}
                        {row.failures_7d > 0 && (
                          <p className="mt-1.5 max-w-[220px] text-[11px] text-amber-300" title={row.latest_failure ?? ''}>
                            {row.failures_7d} failed report{row.failures_7d === 1 ? '' : 's'}: {row.latest_failure}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[11px] text-muted-foreground">
                          {row.number_mode === 'dedicated' ? 'One per rep' : 'Shared'} · {row.max_channels} line{row.max_channels === 1 ? '' : 's'}
                        </p>
                        {row.numbers.slice(0, 3).map((n) => (
                          <p key={n} className="font-mono text-xs text-foreground">{n}</p>
                        ))}
                        {row.numbers.length > 3 && <p className="text-[11px] text-muted-foreground">+{row.numbers.length - 3} more</p>}
                      </td>
                      <td className="px-5 py-4 text-right font-mono">{row.reps_on_ivr}</td>
                      <td className="px-5 py-4 text-right font-mono">
                        {row.calls_7d}
                        <p className="text-[11px] text-muted-foreground">{row.answered_7d} answered</p>
                      </td>
                      <td className="px-5 py-4 text-right font-mono">{row.talk_minutes_7d}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {row.last_webhook_at ? relativeTime(row.last_webhook_at) : (
                          <span className="text-amber-300">Never — check the app's webhook</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {/* Not the balance: TeleCMI's balance API does not read the
                            Connle wallet, so it said 0 against a funded account.
                            Check the wallet in Connle; this column says whether
                            the saved credentials still work. */}
                        {row.verify_error ? (
                          <span className="text-red-400">{row.verify_error}</span>
                        ) : (
                          <span className="text-emerald-400">Credentials OK</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => refresh.mutate(row.org_id)}
                            title="Check the saved credentials with TeleCMI"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-foreground hover:bg-surface-2 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending && refresh.variables === row.org_id ? 'animate-spin' : ''}`} />
                            Check
                          </button>
                          {row.ready && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => toggle.mutate({ orgId: row.org_id, enabled: !row.is_enabled })}
                              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold disabled:opacity-50 ${
                                row.is_enabled
                                  ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                  : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                            >
                              {row.is_enabled ? <Power className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              {row.is_enabled ? 'Turn off' : 'Turn on'}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => confirmRelease(row)}
                            title="Release this TeleCMI app so another organisation can connect it"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                          >
                            <Unplug className="h-3.5 w-3.5" />
                            Disconnect
                          </button>
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
    </AdminLayout>
  );
}
