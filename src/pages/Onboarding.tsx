import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, FileSignature, FileText, Filter, Loader2, MailCheck,
  MailWarning, Plus, Search, Send, Server, ShieldAlert, Sparkles, UserCheck, Users, UserX, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { Panel } from '@/components/admin/Panel';
import { StatCard } from '@/components/admin/StatCard';
import { StatusPill, type Tone } from '@/components/admin/StatusPill';
import { EmptyState } from '@/components/admin/EmptyState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  adminClientsApi, type ApiError, type ClientPage, type ClientRow, type ClientStatusFilter,
  type OnboardClientRequest,
} from '@/services/api';
import { qk } from '@/lib/queryKeys';
import { initials, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

type FilterStatus = ClientStatusFilter;

// ─── Dates ────────────────────────────────────────────────────────────────
// Trial dates are IST calendar days and go to the API as bare YYYY-MM-DD,
// never through toISOString(), which would shift them across midnight UTC.

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function prettyDate(input?: string | null): string {
  if (!input) return '—';
  const s = input.length === 10 ? `${input}T00:00:00` : input;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(input?: string | null): number | null {
  if (!input) return null;
  const end = new Date(input.slice(0, 10) + 'T00:00:00').getTime();
  const today = new Date(todayLocal() + 'T00:00:00').getTime();
  return Math.round((end - today) / 86_400_000);
}

function credits(v?: number | string | null): string {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0';
}

// ─── Plan state display ───────────────────────────────────────────────────

const PLAN_LABEL: Record<string, { label: string; tone: Tone }> = {
  trial: { label: 'Trial', tone: 'info' },
  active: { label: 'Paid plan', tone: 'success' },
  grace: { label: 'Grace period', tone: 'warning' },
  read_only: { label: 'Read-only', tone: 'warning' },
  suspended: { label: 'Locked', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  none: { label: 'No plan', tone: 'neutral' },
};

/** A lapsed trial is a trial account (no paid plan) past its end date. */
function isTrialLike(c: ClientRow) {
  return !!c.trial_ends_at && c.plan_state !== 'active';
}

// ─── Form ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  company_name: '', admin_name: '', admin_title: '', admin_email: '', admin_phone: '',
  business_type: '', gst_number: '', pan_number: '', cin_number: '', registered_address: '', industry: '',
  give_trial: true,
  trial_days: '14', trial_credits: '800', pilot_seats: '1',
  agreement_effective_date: todayLocal(), agreement_reference: '',
};
type FormState = typeof EMPTY_FORM;

function toRequest(f: FormState): OnboardClientRequest {
  const opt = (v: string) => (v.trim() ? v.trim() : undefined);
  const req: OnboardClientRequest = {
    company_name: f.company_name.trim(),
    admin_name: f.admin_name.trim(),
    admin_email: f.admin_email.trim().toLowerCase(),
    admin_phone: opt(f.admin_phone),
    admin_title: opt(f.admin_title),
    business_type: opt(f.business_type),
    gst_number: opt(f.gst_number)?.toUpperCase(),
    pan_number: opt(f.pan_number)?.toUpperCase(),
    cin_number: opt(f.cin_number)?.toUpperCase(),
    registered_address: opt(f.registered_address),
    industry: opt(f.industry),
  };
  if (f.give_trial) {
    req.trial_days = Number(f.trial_days);
    req.trial_credits = Number(f.trial_credits || 0);
    req.pilot_seats = Number(f.pilot_seats || 1);
    req.agreement_effective_date = f.agreement_effective_date || undefined;
    req.agreement_reference = opt(f.agreement_reference);
  }
  return req;
}

const PAGE_SIZE = 25;

/** The dropdown options list shares the clients prefix but is an array, not a page. */
function isClientPage(v: unknown): v is ClientPage {
  return !!v && typeof v === 'object' && Array.isArray((v as ClientPage).items);
}

/**
 * Suspend and restore share one optimistic path — only the target status
 * differs. The row flips the moment the button is pressed and rolls back
 * intact if the server refuses.
 */
function useAccessMutation(
  action: 'activate' | 'deactivate',
  call: (orgId: string) => Promise<{ message: string }>,
) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: call,
    onMutate: async (orgId: string) => {
      await qc.cancelQueries({ queryKey: qk.clients });
      // Snapshot every cached page, then flip the row wherever it appears.
      const previous = qc.getQueriesData<ClientPage>({ queryKey: qk.clients });
      qc.setQueriesData<ClientPage>({ queryKey: qk.clients }, (page) =>
        isClientPage(page)
          ? {
              ...page,
              items: page.items.map((c) =>
                c.org_id === orgId
                  ? { ...c, status: action === 'deactivate' ? 'suspended' : 'provisioned' }
                  : c,
              ),
            }
          : page,
      );
      return { previous };
    },
    onSuccess: (data) => toast.success(data?.message || 'Access updated'),
    onError: (err: ApiError, _orgId, ctx) => {
      ctx?.previous.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(err?.detail || 'Could not update access');
    },
    // The tab counts and the active/suspended filters just changed.
    onSettled: () => qc.invalidateQueries({ queryKey: qk.clients }),
  });
}

export default function Onboarding() {
  const qc = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterStatus>('all');
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [confirm, setConfirm] = useState<{ client: ClientRow; action: 'activate' | 'deactivate' } | null>(null);
  const [trialFor, setTrialFor] = useState<ClientRow | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Search runs on the server, so wait for a pause in typing before asking.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const pageParams = { page, size: PAGE_SIZE, search, status: activeTab };
  const { data, isLoading, isFetching } = useQuery({
    queryKey: qk.clientPage(pageParams),
    queryFn: () => adminClientsApi.page(pageParams),
    // Keep the current rows on screen while the next page loads.
    placeholderData: keepPreviousData,
  });
  const clients = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  // If the list shrank under us (a client suspended out of the Active tab,
  // say), don't sit on a page that no longer exists.
  useEffect(() => {
    if (data && page > data.pages) setPage(data.pages);
  }, [data, page]);

  /** Show a server-returned row at once, then refresh counts and filters. */
  const putRow = (row: ClientRow) => {
    if (!row?.id) return;
    qc.setQueriesData<ClientPage>({ queryKey: qk.clients }, (p) =>
      isClientPage(p) ? { ...p, items: p.items.map((c) => (c.id === row.id ? row : c)) } : p,
    );
    qc.invalidateQueries({ queryKey: qk.clients });
  };

  // ─── Mutations ─────────────────────────────────────────────────────────
  const onboardMutation = useMutation({
    mutationFn: (data: FormState) => adminClientsApi.onboard(toRequest(data)),
    onSuccess: (created) => {
      if (created?.welcome_email_sent_at) {
        toast.success(`${created.company_name} provisioned`, {
          description: `Welcome email sent to ${created.admin_email}.`,
        });
      } else {
        toast.warning(`${created?.company_name || 'Workspace'} provisioned, but the welcome email failed`, {
          description: 'Use "Resend welcome" on the client row once mail is working.',
        });
      }
      // A new client is newest-first: page one of the unfiltered list.
      setSearchQuery('');
      setSearch('');
      setActiveTab('all');
      setPage(1);
      qc.invalidateQueries({ queryKey: qk.clients });
      // Head-count and workspace tiles on the dashboard just changed.
      qc.invalidateQueries({ queryKey: qk.dashboard });
      setIsFormOpen(false);
      setFormData({ ...EMPTY_FORM, agreement_effective_date: todayLocal() });
    },
    onError: (err: ApiError) => toast.error(err?.detail || 'Failed to onboard client'),
  });

  const resendMutation = useMutation({
    mutationFn: (orgId: string) => adminClientsApi.resendWelcome(orgId),
    onSuccess: (row) => {
      putRow(row);
      toast.success(`Welcome email sent to ${row.admin_email}`);
    },
    onError: (err: ApiError) => toast.error(err?.detail || 'Could not send the welcome email'),
  });

  const deactivateMutation = useAccessMutation('deactivate', adminClientsApi.deactivate);
  const activateMutation = useAccessMutation('activate', adminClientsApi.activate);

  // ─── Derived ───────────────────────────────────────────────────────────
  // Totals across every client, from the server — not just this page.
  const c = data?.counts;
  const counts = {
    total: c?.all ?? 0, active: c?.active ?? 0, suspended: c?.suspended ?? 0,
    pending: c?.pending ?? 0, onTrial: c?.on_trial ?? 0,
  };
  const filteredClients = clients;
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(page * PAGE_SIZE, total);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const runConfirmed = () => {
    if (!confirm) return;
    const { client, action } = confirm;
    (action === 'activate' ? activateMutation : deactivateMutation).mutate(client.org_id);
    setConfirm(null);
  };

  const trialDays = Number(formData.trial_days);
  const trialValid = !formData.give_trial || (Number.isInteger(trialDays) && trialDays >= 1 && trialDays <= 365);
  const previewEnd = formData.give_trial && trialValid && formData.agreement_effective_date
    ? addDays(formData.agreement_effective_date, trialDays)
    : null;
  const previewEndsInPast = previewEnd !== null && previewEnd < todayLocal();

  const TABS: { id: FilterStatus; label: string; icon: typeof Filter; count: number }[] = [
    { id: 'all', label: 'All clients', icon: Filter, count: counts.total },
    { id: 'pending', label: 'Awaiting activation', icon: MailWarning, count: counts.pending },
    { id: 'active', label: 'Active', icon: CheckCircle2, count: counts.active },
    { id: 'suspended', label: 'Suspended', icon: XCircle, count: counts.suspended },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 pb-6">
        <PageHeader
          icon={Building2}
          title="Client Provisioning"
          description="Create ArthaX workspaces, grant trials and control platform-wide access for every client organisation."
          actions={
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Provision new client
            </button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard index={0} label="Workspaces" value={counts.total} icon={Building2} tone="primary" hint="Total onboarded organisations" />
          <StatCard index={1} label="On trial" value={counts.onTrial} icon={Sparkles} tone="primary" hint="Trial running now" />
          <StatCard index={2} label="Awaiting activation" value={counts.pending} icon={MailWarning} tone="warning" hint="Never completed first login" />
          <StatCard index={3} label="Suspended" value={counts.suspended} icon={ShieldAlert} tone="danger" hint="Login blocked org-wide" />
        </div>

        <Panel
          flush
          title="Client base"
          icon={Users}
          actions={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search company, email or ref…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field h-9 w-56 py-0 pl-9 text-[13px]"
              />
            </div>
          }
        >
          <div className="flex flex-wrap items-center gap-1 border-b border-border/50 px-4 py-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] tabular',
                    activeTab === tab.id ? 'bg-black/20' : 'bg-muted/60',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/50 bg-surface-2/40 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Organisation</th>
                  <th className="px-5 py-3.5">Primary admin</th>
                  <th className="px-5 py-3.5">Trial &amp; plan</th>
                  <th className="px-5 py-3.5">Activation</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  [0, 1, 2].map((i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-5 py-4">
                        <div className="shimmer h-12 rounded-lg bg-muted/20" />
                      </td>
                    </tr>
                  ))
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={Building2}
                        title={counts.total === 0 ? 'No clients yet' : 'No matching clients'}
                        description={
                          counts.total === 0
                            ? 'Provision the first workspace to get an organisation onto ArthaX.'
                            : 'Try a different search term or switch tabs.'
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const isSuspended = client.status === 'suspended';
                    const busy =
                      (deactivateMutation.isPending && deactivateMutation.variables === client.org_id) ||
                      (activateMutation.isPending && activateMutation.variables === client.org_id);
                    const resending = resendMutation.isPending && resendMutation.variables === client.org_id;
                    const plan = PLAN_LABEL[client.plan_state ?? 'none'] ?? PLAN_LABEL.none;
                    const left = daysUntil(client.trial_ends_at);

                    return (
                      <tr
                        key={client.id}
                        className={cn(
                          'group transition-colors hover:bg-muted/20',
                          isSuspended && 'bg-red-500/[0.03]',
                        )}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold',
                                isSuspended
                                  ? 'border-red-500/25 bg-red-500/10 text-red-400'
                                  : 'border-primary/25 bg-primary/10 text-primary',
                              )}
                            >
                              {initials(client.company_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-foreground">
                                {client.company_name}
                              </p>
                              <p className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>joined {relativeTime(client.created_at)}</span>
                                {client.gst_number && (
                                  <>
                                    <span className="text-muted-foreground/40">·</span>
                                    <span className="font-mono">GST {client.gst_number}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[13px] font-medium text-foreground">
                            {client.admin_name}
                            {client.admin_title && (
                              <span className="font-normal text-muted-foreground"> · {client.admin_title}</span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{client.admin_email}</p>
                          {client.admin_phone && (
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                              {client.admin_phone}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <StatusPill tone={plan.tone}>{plan.label}</StatusPill>
                          {isTrialLike(client) && (
                            <p className="mt-1.5 text-[11px] text-muted-foreground">
                              {client.plan_state === 'trial'
                                ? <>ends {prettyDate(client.trial_ends_at)}{left !== null && left >= 0 && <span className={cn('font-semibold', left <= 3 ? 'text-amber-400' : 'text-foreground/80')}> · {left === 0 ? 'today' : `${left}d left`}</span>}</>
                                : <>trial ended {prettyDate(client.trial_ends_at)}</>}
                            </p>
                          )}
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {credits(client.credit_balance)} credits
                            {(() => {
                              // Paid plan: its seats. Trial: the pilot seats.
                              const limit = client.plan_state === 'active' || client.plan_seats
                                ? client.plan_seats : client.pilot_seats;
                              return limit ? (
                                <span className={cn((client.seats_used ?? 0) >= limit && 'font-semibold text-amber-400')}>
                                  {' · '}{client.seats_used ?? 0}/{limit} seats
                                </span>
                              ) : null;
                            })()}
                          </p>
                          {client.agreement_reference && (
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                              {client.agreement_reference}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {client.activation_pending ? (
                            <div className="space-y-1">
                              <StatusPill tone="warning" dot pulse>Awaiting activation</StatusPill>
                              <p className="text-[10px] text-muted-foreground">
                                {client.welcome_email_sent_at
                                  ? <>welcome sent {relativeTime(client.welcome_email_sent_at)}</>
                                  : <span className="font-semibold text-red-400">welcome email not sent</span>}
                              </p>
                            </div>
                          ) : client.activated_at ? (
                            <div className="space-y-1">
                              <StatusPill tone="success" dot>Activated</StatusPill>
                              <p className="text-[10px] text-muted-foreground">
                                {prettyDate(client.activated_at)}
                                {client.pilot_agreement_accepted_at && ' · agreement accepted'}
                              </p>
                            </div>
                          ) : (
                            <StatusPill tone="neutral">Before activation flow</StatusPill>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <StatusPill tone={isSuspended ? 'danger' : 'success'} dot>
                            {isSuspended ? 'Suspended' : 'Active'}
                          </StatusPill>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {client.activation_pending && (
                              <button
                                onClick={() => resendMutation.mutate(client.org_id)}
                                disabled={resending}
                                title="Send the welcome email with activation instructions again"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                              >
                                {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                Resend welcome
                              </button>
                            )}
                            {client.plan_state !== 'active' && (
                              <button
                                onClick={() => setTrialFor(client)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition-all hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400"
                              >
                                <CalendarClock className="h-3.5 w-3.5" />
                                {client.trial_ends_at ? 'Trial' : 'Give trial'}
                              </button>
                            )}
                            <button
                              onClick={() =>
                                setConfirm({ client, action: isSuspended ? 'activate' : 'deactivate' })
                              }
                              disabled={busy}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all disabled:opacity-50',
                                isSuspended
                                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                  : 'border-border/70 text-muted-foreground hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400',
                              )}
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : isSuspended ? (
                                <UserCheck className="h-3.5 w-3.5" />
                              ) : (
                                <UserX className="h-3.5 w-3.5" />
                              )}
                              {isSuspended ? 'Restore' : 'Suspend'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-5 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              {total === 0
                ? 'No clients'
                : <>Showing <b className="text-foreground">{firstRow}–{lastRow}</b> of <b className="text-foreground">{total}</b></>}
              {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1.5 font-semibold transition-colors hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="tabular">Page {page} of {pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1.5 font-semibold transition-colors hover:text-foreground disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Panel>
      </div>

      {/* ── Provisioning form ────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto custom-scrollbar border-border/60 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5 text-primary" /> Set up a new workspace
            </DialogTitle>
            <DialogDescription>
              Creates the organisation and its first admin, and emails them how to activate. They verify
              their email, accept the documents and choose their own password. You never set one.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!trialValid) {
                toast.error('Trial length must be between 1 and 365 days.');
                return;
              }
              if (previewEndsInPast) {
                toast.error('That effective date and trial length end the trial in the past.');
                return;
              }
              onboardMutation.mutate(formData);
            }}
            className="space-y-6 pt-2"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="border-b border-border/50 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Account &amp; admin
                </h3>
                <Field label="Company name" required name="company_name" value={formData.company_name} onChange={handleInputChange} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Admin name" required name="admin_name" value={formData.admin_name} onChange={handleInputChange} />
                  <Field label="Job title" name="admin_title" value={formData.admin_title} onChange={handleInputChange} placeholder="e.g. Marketing Head" />
                </div>
                <Field label="Admin email (login)" required type="email" name="admin_email" value={formData.admin_email} onChange={handleInputChange} />
                <Field label="Phone" name="admin_phone" value={formData.admin_phone} onChange={handleInputChange} placeholder="+91 98765 43210" />
              </div>

              <div className="space-y-4">
                <h3 className="flex items-center gap-2 border-b border-border/50 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" /> Compliance &amp; legal (KYC)
                </h3>
                <div>
                  <label className="field-label">Business structure</label>
                  <select
                    name="business_type"
                    value={formData.business_type}
                    onChange={handleInputChange}
                    className="field"
                  >
                    <option value="">Select structure…</option>
                    <option value="Private Limited">Private Limited</option>
                    <option value="LLP">LLP</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="GSTIN" name="gst_number" value={formData.gst_number} onChange={handleInputChange} className="uppercase" />
                  <Field label="Company PAN" name="pan_number" value={formData.pan_number} onChange={handleInputChange} className="uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CIN" name="cin_number" value={formData.cin_number} onChange={handleInputChange} className="uppercase" />
                  <Field label="Industry sector" name="industry" value={formData.industry} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="field-label">Registered office address</label>
                  <textarea
                    name="registered_address"
                    value={formData.registered_address}
                    onChange={handleInputChange}
                    rows={2}
                    className="field resize-none"
                    placeholder="Printed in the pilot agreement"
                  />
                </div>
              </div>
            </div>

            {/* Trial */}
            <div className="rounded-xl border border-border/60 bg-surface-2/30 p-4">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> Give a trial
                  <span className="text-xs font-normal text-muted-foreground">
                    starts immediately; client accepts a personalised pilot agreement at first login
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={formData.give_trial}
                  onChange={(e) => setFormData((f) => ({ ...f, give_trial: e.target.checked }))}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
              </label>

              {formData.give_trial ? (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Field label="Trial days" required type="number" min={1} max={365} name="trial_days" value={formData.trial_days} onChange={handleInputChange} />
                    <Field label="AI credits" type="number" min={0} step="any" name="trial_credits" value={formData.trial_credits} onChange={handleInputChange} />
                    <Field label="User seats" type="number" min={1} name="pilot_seats" value={formData.pilot_seats} onChange={handleInputChange} />
                    <Field label="Effective date" required type="date" name="agreement_effective_date" value={formData.agreement_effective_date} onChange={handleInputChange} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field
                      label="Agreement reference" name="agreement_reference" value={formData.agreement_reference}
                      onChange={handleInputChange} placeholder="Leave blank for the next AX-YYYY-NNNN"
                    />
                    <div className={cn(
                      'flex items-center gap-2 self-end rounded-lg border px-3 py-2.5 text-xs',
                      previewEndsInPast ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-primary/20 bg-primary/5 text-foreground/90',
                    )}>
                      <CalendarClock className="h-4 w-4 shrink-0" />
                      {previewEnd
                        ? previewEndsInPast
                          ? <>Ends {prettyDate(previewEnd)}, which is in the past</>
                          : <>Trial runs until end of <b>{prettyDate(previewEnd)}</b>. Reminders go out 3 days, 2 days before, and on the last day.</>
                        : 'Enter 1–365 days'}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  No trial: after activating, the client lands on Billing and must choose a plan before the workspace opens.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg border border-border/70 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={onboardMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-50"
              >
                {onboardMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {onboardMutation.isPending ? 'Provisioning…' : 'Launch workspace & send welcome'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Trial editor ─────────────────────────────────────────────── */}
      <TrialDialog
        client={trialFor}
        onClose={() => setTrialFor(null)}
        onSaved={(row) => {
          putRow(row);
          setTrialFor(null);
        }}
      />

      {/* ── Access confirmation ──────────────────────────────────────── */}
      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirm?.action === 'deactivate' ? (
                <UserX className="h-5 w-5 text-red-400" />
              ) : (
                <UserCheck className="h-5 w-5 text-emerald-400" />
              )}
              {confirm?.action === 'deactivate' ? 'Suspend' : 'Restore'} {confirm?.client.company_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === 'deactivate'
                ? 'Every user in this organisation is signed out and blocked from logging in until the workspace is restored.'
                : 'All users in this organisation regain access and can log in again immediately.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirmed}
              className={cn(
                confirm?.action === 'deactivate' &&
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              )}
            >
              {confirm?.action === 'deactivate' ? 'Suspend workspace' : 'Restore access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

// ─── Trial editor ─────────────────────────────────────────────────────────

function TrialDialog({
  client, onClose, onSaved,
}: {
  client: ClientRow | null;
  onClose: () => void;
  onSaved: (row: ClientRow) => void;
}) {
  const [endsOn, setEndsOn] = useState('');
  const [addCredits, setAddCredits] = useState('');
  const [seats, setSeats] = useState('');
  const [lastId, setLastId] = useState<string | null>(null);

  // Reset the fields every time the dialog opens, including for the same
  // client again — a leftover "add credits" value would otherwise be added a
  // second time by a careless save.
  if (client && client.id !== lastId) {
    setLastId(client.id);
    setEndsOn(client.trial_ends_at ? client.trial_ends_at.slice(0, 10) : addDays(todayLocal(), 14));
    setAddCredits('');
    setSeats(String(client.pilot_seats ?? 1));
  } else if (!client && lastId !== null) {
    setLastId(null);
  }

  const mutation = useMutation({
    mutationFn: () =>
      adminClientsApi.updateTrial(client!.org_id, {
        ends_on: endsOn,
        add_credits: addCredits ? Number(addCredits) : undefined,
        seats: seats ? Number(seats) : undefined,
      }),
    onSuccess: (row) => {
      toast.success(`Trial for ${row.company_name} now ends ${prettyDate(row.trial_ends_at)}`);
      onSaved(row);
    },
    onError: (err: ApiError) => toast.error(err?.detail || 'Could not update the trial'),
  });

  const hasTrial = !!client?.trial_ends_at;
  const lapsed = hasTrial && client?.plan_state !== 'trial';
  const seatsNum = Number(seats);
  const invalid = !endsOn || endsOn <= todayLocal() || !Number.isInteger(seatsNum) || seatsNum < 1;

  return (
    <Dialog open={!!client} onOpenChange={(open) => { if (!open) { setLastId(null); onClose(); } }}>
      <DialogContent className="max-w-lg border-border/60 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-5 w-5 text-primary" />
            {hasTrial ? 'Edit trial' : 'Give a trial'} · {client?.company_name}
          </DialogTitle>
          <DialogDescription>
            {hasTrial
              ? lapsed
                ? 'This trial has ended. Setting a future end date reopens it and returns its locked credits.'
                : 'Move the end date or add credits. Reminders are re-sent for a new end date.'
              : 'Starts a trial now. The client accepts the pilot agreement when they activate.'}
          </DialogDescription>
        </DialogHeader>

        {client && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (!invalid) mutation.mutate(); }}
            className="space-y-4 pt-1"
          >
            {hasTrial && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <Fact label="Current end" value={prettyDate(client.trial_ends_at)} />
                <Fact label="Credits left" value={credits(client.credit_balance)} />
                <Fact label="Agreement" value={client.agreement_reference ?? '—'} />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Field
                label="Trial ends on" required type="date" min={addDays(todayLocal(), 1)}
                value={endsOn} onChange={(e) => setEndsOn(e.target.value)}
              />
              <Field
                label="Add credits" type="number" min={0} step="any" placeholder="0"
                value={addCredits} onChange={(e) => setAddCredits(e.target.value)}
              />
              <Field
                label="User seats" required type="number" min={1}
                value={seats} onChange={(e) => setSeats(e.target.value)}
              />
            </div>
            <p className="-mt-1 text-[11px] text-muted-foreground">
              {client.seats_used ?? 0} active user{(client.seats_used ?? 0) === 1 ? '' : 's'} now. Until they pay for a plan,
              the client can't add users beyond their seats. Lowering seats doesn't remove anyone; it only blocks new users.
              Credits are shared by the whole org either way.
            </p>

            <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-surface-2/30 p-3 text-[11px] text-muted-foreground">
              <FileSignature className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {client.activation_pending
                ? 'Not activated yet, so their pilot agreement will show these new terms when they review it.'
                : client.pilot_agreement_accepted_at
                  ? 'They already accepted their pilot agreement. That stays as signed; this change is an extension outside it (Clause 3.2).'
                  : 'They activated without a trial, so no pilot agreement was accepted. The server will refuse a new trial.'}
              {' '}Trial credits expire when the trial ends.
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4">
              <button
                type="button" onClick={() => { setLastId(null); onClose(); }}
                className="rounded-lg border border-border/70 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={mutation.isPending || invalid}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:shadow-glow disabled:opacity-50"
              >
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                {hasTrial ? 'Save trial' : 'Start trial'}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-semibold text-foreground">{value}</p>
    </div>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

function Field({ label, className, ...props }: FieldProps) {
  return (
    <div>
      <label className="field-label">
        {label} {props.required && <span className="text-primary">*</span>}
      </label>
      <input {...props} className={cn('field', className)} />
    </div>
  );
}
