import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, CheckCircle2, FileText, Filter, Loader2, Plus, Search, Server,
  ShieldAlert, UserCheck, Users, UserX, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { Panel } from '@/components/admin/Panel';
import { StatCard } from '@/components/admin/StatCard';
import { StatusPill } from '@/components/admin/StatusPill';
import { EmptyState } from '@/components/admin/EmptyState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { adminClientsApi } from '@/services/api';
import { qk } from '@/lib/queryKeys';
import { initials, relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'active' | 'suspended';

interface ClientRow {
  id: string;
  org_id: string;
  company_name: string;
  admin_name: string;
  admin_email: string;
  admin_phone?: string | null;
  business_type?: string | null;
  gst_number?: string | null;
  pan_number?: string | null;
  industry?: string | null;
  status: string;
  created_at: string;
}

const EMPTY_FORM = {
  company_name: '', admin_name: '', admin_email: '', admin_phone: '',
  business_type: '', gst_number: '', pan_number: '', industry: '', temporary_password: '',
};

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
      const previous = qc.getQueryData<ClientRow[]>(qk.clients);
      qc.setQueryData<ClientRow[]>(qk.clients, (curr = []) =>
        curr.map((c) =>
          c.org_id === orgId
            ? { ...c, status: action === 'deactivate' ? 'suspended' : 'provisioned' }
            : c,
        ),
      );
      return { previous };
    },
    onSuccess: (data) => toast.success(data?.message || 'Access updated'),
    onError: (err: any, _orgId, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.clients, ctx.previous);
      toast.error(err?.detail || 'Could not update access');
    },
  });
}

export default function Onboarding() {
  const qc = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterStatus>('all');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [confirm, setConfirm] = useState<{ client: ClientRow; action: 'activate' | 'deactivate' } | null>(null);

  const { data: clients = [], isLoading } = useQuery<ClientRow[]>({
    queryKey: qk.clients,
    queryFn: adminClientsApi.list,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────
  // The provisioned workspace comes back in the response, so it is pushed
  // straight onto the list — the new row is on screen before a refetch could
  // even have left the browser.
  const onboardMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => adminClientsApi.onboard(data),
    onSuccess: (created: ClientRow) => {
      toast.success(`${created?.company_name || 'Workspace'} provisioned`);
      qc.setQueryData<ClientRow[]>(qk.clients, (curr = []) =>
        created?.id ? [created, ...curr.filter((c) => c.id !== created.id)] : curr,
      );
      // Head-count and workspace tiles on the dashboard just changed.
      qc.invalidateQueries({ queryKey: qk.dashboard });
      setIsFormOpen(false);
      setFormData(EMPTY_FORM);
    },
    onError: (err: any) => toast.error(err?.detail || 'Failed to onboard client'),
  });

  const deactivateMutation = useAccessMutation('deactivate', adminClientsApi.deactivate);
  const activateMutation = useAccessMutation('activate', adminClientsApi.activate);

  // ─── Derived ───────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const suspended = clients.filter((c) => c.status === 'suspended').length;
    return { total: clients.length, suspended, active: clients.length - suspended };
  }, [clients]);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        !q ||
        client.company_name?.toLowerCase().includes(q) ||
        client.admin_email?.toLowerCase().includes(q);

      const isSuspended = client.status === 'suspended';
      if (activeTab === 'active') return matchesSearch && !isSuspended;
      if (activeTab === 'suspended') return matchesSearch && isSuspended;
      return matchesSearch;
    });
  }, [clients, searchQuery, activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const runConfirmed = () => {
    if (!confirm) return;
    const { client, action } = confirm;
    (action === 'activate' ? activateMutation : deactivateMutation).mutate(client.org_id);
    setConfirm(null);
  };

  const TABS: { id: FilterStatus; label: string; icon: typeof Filter; count: number }[] = [
    { id: 'all', label: 'All clients', icon: Filter, count: counts.total },
    { id: 'active', label: 'Active', icon: CheckCircle2, count: counts.active },
    { id: 'suspended', label: 'Suspended', icon: XCircle, count: counts.suspended },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 pb-6">
        <PageHeader
          icon={Building2}
          title="Client Provisioning"
          description="Create ArthaX workspaces, track KYC and control platform-wide access for every client organisation."
          actions={
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> Provision new client
            </button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard index={0} label="Workspaces" value={counts.total} icon={Building2} tone="primary" hint="Total onboarded organisations" />
          <StatCard index={1} label="Active" value={counts.active} icon={CheckCircle2} tone="success" hint="Users can sign in" />
          <StatCard index={2} label="Suspended" value={counts.suspended} icon={ShieldAlert} tone="danger" hint="Login blocked org-wide" />
        </div>

        <Panel
          flush
          title="Client base"
          icon={Users}
          actions={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search company or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field h-9 w-56 py-0 pl-9 text-[13px]"
              />
            </div>
          }
        >
          <div className="flex items-center gap-1 border-b border-border/50 px-4 py-3">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
                  <th className="px-5 py-3.5">Compliance</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  [0, 1, 2].map((i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-5 py-4">
                        <div className="shimmer h-12 rounded-lg bg-muted/20" />
                      </td>
                    </tr>
                  ))
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={Building2}
                        title={clients.length === 0 ? 'No clients yet' : 'No matching clients'}
                        description={
                          clients.length === 0
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
                                <span className="font-mono">{client.org_id?.slice(0, 8)}…</span>
                                <span className="text-muted-foreground/40">·</span>
                                <span>joined {relativeTime(client.created_at)}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-[13px] font-medium text-foreground">{client.admin_name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{client.admin_email}</p>
                          {client.admin_phone && (
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
                              {client.admin_phone}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            <KycChip label="GST" value={client.gst_number} />
                            <KycChip label="PAN" value={client.pan_number} />
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <StatusPill tone={isSuspended ? 'danger' : 'success'} dot>
                            {isSuspended ? 'Suspended' : 'Active'}
                          </StatusPill>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              onClick={() =>
                                setConfirm({ client, action: isSuspended ? 'activate' : 'deactivate' })
                              }
                              disabled={busy}
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all disabled:opacity-50',
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
        </Panel>
      </div>

      {/* ── Provisioning form ────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto custom-scrollbar border-border/60 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5 text-primary" /> Set up a new workspace
            </DialogTitle>
            <DialogDescription>
              Creates the organisation, its first admin account and the login they will use.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
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
                  <Field label="Phone" name="admin_phone" value={formData.admin_phone} onChange={handleInputChange} />
                </div>
                <Field label="Admin email (login)" required type="email" name="admin_email" value={formData.admin_email} onChange={handleInputChange} />
                <Field
                  label="Temporary password" name="temporary_password" value={formData.temporary_password}
                  onChange={handleInputChange} placeholder="Default: Admin@123"
                />
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
                <Field label="Industry sector" name="industry" value={formData.industry} onChange={handleInputChange} />
              </div>
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
                {onboardMutation.isPending ? 'Provisioning…' : 'Launch workspace'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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

function KycChip({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-7 font-bold text-muted-foreground">{label}</span>
      <span
        className={cn(
          'rounded border px-1.5 py-0.5 font-mono',
          value
            ? 'border-border/60 bg-background/50 text-foreground/80'
            : 'border-amber-500/20 bg-amber-500/10 text-amber-400/80',
        )}
      >
        {value || 'PENDING'}
      </span>
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
