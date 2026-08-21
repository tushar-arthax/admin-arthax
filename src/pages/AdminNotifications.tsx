import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Bell, Building2, Globe, History, Info, Loader2, Megaphone,
  Send, ShieldAlert, Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { Panel } from '@/components/admin/Panel';
import { EmptyState } from '@/components/admin/EmptyState';
import { StatusPill, Tone } from '@/components/admin/StatusPill';
import {
  AdminNotification, adminClientsApi, adminNotificationApi, NotificationType,
} from '@/services/api';
import { qk } from '@/lib/queryKeys';
import { dateTime, nowNaive, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const TYPES: { value: NotificationType; label: string; icon: typeof Info; tone: Tone }[] = [
  { value: 'information', label: 'Information', icon: Info, tone: 'info' },
  { value: 'alert', label: 'Critical alert', icon: AlertTriangle, tone: 'danger' },
  { value: 'system', label: 'System update', icon: Zap, tone: 'warning' },
  { value: 'admin', label: 'Admin direct', icon: ShieldAlert, tone: 'primary' },
];

const TYPE_META = (type: string) =>
  TYPES.find((t) => t.value === type) ?? { value: 'information' as NotificationType, label: 'Notice', icon: Bell, tone: 'neutral' as Tone };

const TITLE_MAX = 120;
const MESSAGE_MAX = 600;

export default function AdminNotifications() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    message: '',
    notification_type: 'information' as NotificationType,
    org_id: '', // empty means every organisation
  });
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'targeted'>('all');

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: qk.notificationHistory,
    queryFn: () => adminNotificationApi.getHistory(50),
  });

  // Same cache the onboarding screen fills, so the dropdown is usually
  // populated before this page has finished painting.
  const { data: clients = [] } = useQuery({
    queryKey: qk.clients,
    queryFn: adminClientsApi.list,
  });

  const sendMutation = useMutation({
    mutationFn: (data: typeof form) =>
      adminNotificationApi.send({ ...data, org_id: data.org_id === '' ? null : data.org_id }),

    // The broadcast endpoint answers with an acknowledgement, not the stored
    // row — so the entry is written locally first and reconciled against the
    // server's copy as soon as the acknowledgement lands.
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: qk.notificationHistory });
      const previous = qc.getQueryData<AdminNotification[]>(qk.notificationHistory);
      const pending: AdminNotification = {
        id: `pending-${Date.now()}`,
        org_id: data.org_id || undefined,
        title: data.title,
        message: data.message,
        notification_type: data.notification_type,
        created_at: nowNaive(),
      };
      qc.setQueryData<AdminNotification[]>(qk.notificationHistory, [pending, ...(previous ?? [])]);
      return { previous };
    },

    onSuccess: (res) => {
      toast.success(res?.message || 'Notification broadcast');
      setForm({ title: '', message: '', notification_type: 'information', org_id: '' });
      qc.invalidateQueries({ queryKey: qk.notificationHistory });
    },

    onError: (err: any, _data, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.notificationHistory, ctx.previous);
      toast.error(err?.detail || 'Failed to send notification');
    },
  });

  const filteredHistory = useMemo(() => {
    if (scopeFilter === 'global') return history.filter((n) => !n.org_id);
    if (scopeFilter === 'targeted') return history.filter((n) => !!n.org_id);
    return history;
  }, [history, scopeFilter]);

  const orgName = (orgId?: string | null) =>
    (clients as any[]).find((c) => c.org_id === orgId)?.company_name;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('A title and a message are both required');
      return;
    }
    sendMutation.mutate(form);
  };

  const selectedType = TYPE_META(form.notification_type);
  const audience = form.org_id ? orgName(form.org_id) ?? 'Selected organisation' : 'All organisations';

  return (
    <AdminLayout>
      <div className="space-y-6 pb-6">
        <PageHeader
          icon={Megaphone}
          title="Communications Center"
          description="Broadcast maintenance notices, alerts and product updates to one workspace or the whole platform."
          actions={
            <StatusPill tone="neutral">
              {history.length} broadcast{history.length === 1 ? '' : 's'} logged
            </StatusPill>
          }
        />

        <div className="grid gap-6 xl:grid-cols-5">
          {/* ── Composer ─────────────────────────────────────────────── */}
          <div className="xl:col-span-2">
            <Panel title="Create broadcast" icon={Send} className="xl:sticky xl:top-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="field-label">Target audience</label>
                  <select
                    className="field"
                    value={form.org_id}
                    onChange={(e) => setForm((f) => ({ ...f, org_id: e.target.value }))}
                  >
                    <option value="">All organisations (global)</option>
                    {(clients as any[]).map((c) => (
                      <option key={c.org_id} value={c.org_id}>{c.company_name}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {form.org_id ? <Building2 className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    Delivered to {audience}
                  </p>
                </div>

                <div>
                  <label className="field-label">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TYPES.map((t) => {
                      const active = form.notification_type === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, notification_type: t.value }))}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-all',
                            active
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
                          )}
                        >
                          <t.icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="field-label">Title</label>
                    <span className="mb-1.5 text-[10px] tabular text-muted-foreground/70">
                      {form.title.length}/{TITLE_MAX}
                    </span>
                  </div>
                  <input
                    required
                    maxLength={TITLE_MAX}
                    className="field"
                    placeholder="e.g. Scheduled maintenance on Sunday"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="field-label">Message</label>
                    <span className="mb-1.5 text-[10px] tabular text-muted-foreground/70">
                      {form.message.length}/{MESSAGE_MAX}
                    </span>
                  </div>
                  <textarea
                    required
                    rows={5}
                    maxLength={MESSAGE_MAX}
                    className="field resize-none"
                    placeholder="What is changing, when, and what the client needs to do."
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </div>

                {/* What the client will actually see. */}
                <div>
                  <label className="field-label">Preview</label>
                  <div className="panel-flat flex gap-3 p-3.5">
                    <selectedType.icon
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        selectedType.tone === 'danger' && 'text-red-400',
                        selectedType.tone === 'warning' && 'text-amber-400',
                        selectedType.tone === 'info' && 'text-blue-400',
                        selectedType.tone === 'primary' && 'text-primary',
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">
                        {form.title || 'Notification title'}
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {form.message || 'Your message will appear here as the client sees it.'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={sendMutation.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:shadow-glow active:scale-[0.99] disabled:opacity-50"
                >
                  {sendMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Broadcasting…</>
                  ) : (
                    <><Send className="h-4 w-4" /> Send notification</>
                  )}
                </button>
              </form>
            </Panel>
          </div>

          {/* ── History ──────────────────────────────────────────────── */}
          <div className="xl:col-span-3">
            <Panel
              flush
              title="Broadcast history"
              icon={History}
              actions={
                <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-surface-2/50 p-0.5">
                  {(['all', 'global', 'targeted'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setScopeFilter(f)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors',
                        scopeFilter === f
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="custom-scrollbar max-h-[calc(100vh-16rem)] overflow-y-auto p-4">
                {historyLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="shimmer h-20 rounded-xl bg-muted/20" />
                    ))}
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <EmptyState
                    icon={Bell}
                    title="Nothing broadcast yet"
                    description="Notifications you send appear here with their audience and delivery time."
                  />
                ) : (
                  <ol className="relative space-y-3 pl-6">
                    <span className="absolute bottom-3 left-[9px] top-3 w-px bg-border/50" />
                    {filteredHistory.map((notif) => {
                      const meta = TYPE_META(notif.notification_type);
                      const pending = notif.id.startsWith('pending-');
                      return (
                        <li key={notif.id} className="relative">
                          <span
                            className={cn(
                              'absolute -left-[1.31rem] top-5 h-2 w-2 rounded-full ring-4 ring-background',
                              meta.tone === 'danger' && 'bg-red-400',
                              meta.tone === 'warning' && 'bg-amber-400',
                              meta.tone === 'info' && 'bg-blue-400',
                              meta.tone === 'primary' && 'bg-primary',
                              meta.tone === 'neutral' && 'bg-zinc-500',
                            )}
                          />
                          <article
                            className={cn(
                              'panel-flat panel-interactive p-4 transition-opacity',
                              pending && 'opacity-60',
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <meta.icon
                                    className={cn(
                                      'h-3.5 w-3.5 shrink-0',
                                      meta.tone === 'danger' && 'text-red-400',
                                      meta.tone === 'warning' && 'text-amber-400',
                                      meta.tone === 'info' && 'text-blue-400',
                                      meta.tone === 'primary' && 'text-primary',
                                      meta.tone === 'neutral' && 'text-muted-foreground',
                                    )}
                                  />
                                  <h3 className="truncate text-[13px] font-bold text-foreground">
                                    {notif.title}
                                  </h3>
                                </div>
                                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                  {notif.message}
                                </p>
                                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground/70">
                                  <span>{dateTime(notif.created_at)}</span>
                                  <span className="text-muted-foreground/40">·</span>
                                  <span>{pending ? 'sending…' : relativeTime(notif.created_at)}</span>
                                </p>
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-1.5">
                                <StatusPill tone={notif.org_id ? 'purple' : 'success'}>
                                  {notif.org_id ? 'Targeted' : 'Global'}
                                </StatusPill>
                                {notif.org_id && (
                                  <span className="max-w-[9rem] truncate text-[10px] text-muted-foreground">
                                    {orgName(notif.org_id) ?? notif.org_id.slice(0, 8)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </article>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
