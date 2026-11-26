import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Check, Copy, CopyPlus, Filter, Globe2, History, IndianRupee, Loader2, Lock, Pause,
  Pencil, Percent, Play, Plus, Search, Ticket,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { Panel } from '@/components/admin/Panel';
import { StatCard } from '@/components/admin/StatCard';
import { StatusPill } from '@/components/admin/StatusPill';
import { EmptyState } from '@/components/admin/EmptyState';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  adminClientsApi, couponsApi,
  type ApiError, type BillingPlanOption, type ClientOption, type Coupon, type CouponInput,
} from '@/services/api';
import { qk } from '@/lib/queryKeys';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────
// Dates are IST calendar days sent as naive timestamps — never toISOString(),
// which would shift them across midnight UTC.
const startOfDay = (ymd: string) => (ymd ? `${ymd}T00:00:00` : null);
const endOfDay = (ymd: string) => (ymd ? `${ymd}T23:59:59` : null);
const ymd = (v?: string | null) => (v ? v.slice(0, 10) : '');

function inr(v?: number | string | null): string {
  const n = Number(v ?? 0);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function prettyDate(v?: string | null): string {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function discountText(c: Pick<Coupon, 'discount_type' | 'percent_off' | 'amount_off_inr' | 'max_discount_inr'>): string {
  if (c.discount_type === 'percent') {
    const cap = c.max_discount_inr ? ` (max ${inr(c.max_discount_inr)})` : '';
    return `${Number(c.percent_off)}% off${cap}`;
  }
  return `${inr(c.amount_off_inr)} off`;
}

type Status = 'active' | 'paused' | 'expired' | 'scheduled' | 'used_up';

function statusOf(c: Coupon): Status {
  const now = Date.now();
  if (!c.is_active) return 'paused';
  if (c.valid_until && new Date(c.valid_until).getTime() < now) return 'expired';
  if (c.valid_from && new Date(c.valid_from).getTime() > now) return 'scheduled';
  if (c.max_redemptions != null && c.uses >= c.max_redemptions) return 'used_up';
  return 'active';
}

const STATUS_PILL: Record<Status, { label: string; tone: 'success' | 'neutral' | 'warning' | 'danger' | 'info' }> = {
  active: { label: 'Active', tone: 'success' },
  paused: { label: 'Paused', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'danger' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  used_up: { label: 'Fully used', tone: 'warning' },
};

type Tab = 'all' | 'active' | 'paused' | 'ended';
const TAB_MATCH: Record<Tab, (s: Status) => boolean> = {
  all: () => true,
  active: (s) => s === 'active' || s === 'scheduled',
  paused: (s) => s === 'paused',
  ended: (s) => s === 'expired' || s === 'used_up',
};

// ─── Form ─────────────────────────────────────────────────────────────────

const EMPTY = {
  code: '', description: '', discount_type: 'percent' as 'percent' | 'fixed',
  percent_off: '10', amount_off_inr: '', max_discount_inr: '', min_order_inr: '',
  audience: 'public' as 'public' | 'specific', org_ids: [] as string[],
  plan_codes: [] as string[],
  max_redemptions: '', max_per_org: '1', first_purchase_only: false,
  valid_from: '', valid_until: '',
};
type Form = typeof EMPTY;

const str = (v?: number | string | null) => (v === null || v === undefined ? '' : String(Number(v)));

function fromCoupon(c: Coupon, codeOverride?: string): Form {
  return {
    code: codeOverride ?? c.code,
    description: c.description ?? '',
    discount_type: c.discount_type,
    percent_off: str(c.percent_off) || '10',
    amount_off_inr: str(c.amount_off_inr),
    max_discount_inr: str(c.max_discount_inr),
    min_order_inr: str(c.min_order_inr),
    audience: c.org_ids?.length ? 'specific' : 'public',
    org_ids: c.org_ids ?? [],
    plan_codes: c.plan_codes ?? [],
    max_redemptions: str(c.max_redemptions),
    max_per_org: str(c.max_per_org),
    first_purchase_only: c.first_purchase_only,
    valid_from: ymd(c.valid_from),
    valid_until: ymd(c.valid_until),
  };
}

const num = (v: string) => (v.trim() === '' ? null : Number(v));

/** Fields every save sends. Blank = "no limit" (sent as null, which clears it). */
function commonFields(f: Form) {
  return {
    description: f.description.trim() || null,
    min_order_inr: num(f.min_order_inr),
    plan_codes: f.plan_codes.length ? f.plan_codes : null,
    org_ids: f.audience === 'specific' ? f.org_ids : null,
    max_redemptions: num(f.max_redemptions),
    max_per_org: num(f.max_per_org),
    first_purchase_only: f.first_purchase_only,
    valid_from: startOfDay(f.valid_from),
    valid_until: endOfDay(f.valid_until),
  };
}

function discountFields(f: Form) {
  return {
    discount_type: f.discount_type,
    percent_off: f.discount_type === 'percent' ? num(f.percent_off) : null,
    amount_off_inr: f.discount_type === 'fixed' ? num(f.amount_off_inr) : null,
    max_discount_inr: f.discount_type === 'percent' ? num(f.max_discount_inr) : null,
  };
}

function formError(f: Form, discountLocked: boolean): string | null {
  if (f.code.trim().length < 3) return 'Enter a code of at least 3 characters.';
  if (!/^[A-Za-z0-9_-]+$/.test(f.code.trim())) return 'Codes use letters, digits, - or _ only.';
  if (!discountLocked) {
    if (f.discount_type === 'percent' && !(Number(f.percent_off) > 0 && Number(f.percent_off) <= 100)) {
      return 'Percentage must be between 1 and 100.';
    }
    if (f.discount_type === 'fixed' && !(Number(f.amount_off_inr) > 0)) return 'Enter the rupee amount off.';
  }
  if (f.audience === 'specific' && f.org_ids.length === 0) return 'Pick at least one client, or make it public.';
  if (f.valid_from && f.valid_until && f.valid_until < f.valid_from) return 'The end date is before the start date.';
  for (const k of ['max_redemptions', 'max_per_org'] as const) {
    if (f[k].trim() && !(Number.isInteger(Number(f[k])) && Number(f[k]) >= 1)) return 'Use limits must be whole numbers of at least 1 (or blank for no limit).';
  }
  return null;
}

type DialogMode = { kind: 'create' } | { kind: 'duplicate'; from: Coupon } | { kind: 'edit'; coupon: Coupon };

// ─── Page ─────────────────────────────────────────────────────────────────

export default function Coupons() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const [historyFor, setHistoryFor] = useState<Coupon | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery({ queryKey: qk.coupons, queryFn: couponsApi.list });
  const { data: plans = [] } = useQuery({ queryKey: qk.billingPlans, queryFn: couponsApi.plans, staleTime: 5 * 60_000 });
  const { data: orgs = [] } = useQuery({ queryKey: qk.clientOptions, queryFn: adminClientsApi.options, staleTime: 5 * 60_000 });
  const orgName = useMemo(() => new Map(orgs.map((o) => [o.org_id, o.company_name])), [orgs]);
  const planName = useMemo(() => new Map(plans.map((p) => [p.plan_code, p.plan_name])), [plans]);

  const toggleMutation = useMutation({
    mutationFn: (c: Coupon) => couponsApi.update(c.id, { is_active: !c.is_active }),
    onSuccess: (c) => {
      toast.success(`${c.code} ${c.is_active ? 'activated' : 'paused'}`);
      qc.invalidateQueries({ queryKey: qk.coupons });
    },
    onError: (err: ApiError) => toast.error(err?.detail || 'Could not update the coupon'),
  });

  const withStatus = coupons.map((c) => ({ c, status: statusOf(c) }));
  const counts = {
    all: coupons.length,
    active: withStatus.filter((x) => TAB_MATCH.active(x.status)).length,
    paused: withStatus.filter((x) => TAB_MATCH.paused(x.status)).length,
    ended: withStatus.filter((x) => TAB_MATCH.ended(x.status)).length,
  };
  const q = search.trim().toUpperCase();
  const rows = withStatus.filter(({ c, status }) =>
    TAB_MATCH[tab](status) && (!q || c.code.includes(q) || (c.description ?? '').toUpperCase().includes(q)));

  const stats = useMemo(() => ({
    uses: coupons.reduce((n, c) => n + c.uses, 0),
    saved: coupons.reduce((n, c) => n + Number(c.total_discount_inr || 0), 0),
  }), [coupons]);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'active', label: 'Active' },
    { id: 'paused', label: 'Paused' }, { id: 'ended', label: 'Expired / used up' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 pb-6">
        <PageHeader
          icon={Ticket}
          title="Coupons"
          description="Discount codes for plan purchases and renewals. One code per payment; the discount comes off the price before 18% GST and never reduces the credits. Payments stay non-refundable."
          actions={
            <button
              onClick={() => setDialog({ kind: 'create' })}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-glow active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> New coupon
            </button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard index={0} label="Active coupons" value={counts.active} icon={Ticket} tone="primary" hint="Usable now or scheduled" />
          <StatCard index={1} label="Times used" value={stats.uses} icon={History} tone="success" hint="Paid purchases with a coupon" />
          <StatCard index={2} label="Discount given" value={Math.round(stats.saved)} icon={IndianRupee} tone="warning" hint="Rupees off, before GST" />
        </div>

        <Panel
          flush title="All coupons" icon={Ticket}
          actions={
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search code or note…" value={search} onChange={(e) => setSearch(e.target.value)}
                className="field h-9 w-56 py-0 pl-9 text-[13px]"
              />
            </div>
          }
        >
          <div className="flex flex-wrap items-center gap-1 border-b border-border/50 px-4 py-3">
            {TABS.map((t) => (
              <button
                key={t.id} onClick={() => setTab(t.id)}
                className={cn('inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  tab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground')}
              >
                {t.id === 'all' && <Filter className="h-3.5 w-3.5" />}
                {t.label}
                <span className={cn('rounded-full px-1.5 text-[10px] tabular', tab === t.id ? 'bg-black/20' : 'bg-muted/60')}>{counts[t.id]}</span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/50 bg-surface-2/40 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Discount</th>
                  <th className="px-5 py-3.5">Who &amp; what</th>
                  <th className="px-5 py-3.5">Valid</th>
                  <th className="px-5 py-3.5">Used</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-5 py-6"><div className="shimmer h-10 rounded-lg bg-muted/20" /></td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={Ticket}
                        title={coupons.length === 0 ? 'No coupons yet' : 'No matching coupons'}
                        description={coupons.length === 0 ? 'Create a public code for a campaign, or one just for a single client.' : 'Try another search or tab.'}
                      />
                    </td>
                  </tr>
                ) : rows.map(({ c, status }) => {
                  const st = STATUS_PILL[status];
                  const busy = toggleMutation.isPending && toggleMutation.variables?.id === c.id;
                  return (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono text-[13px] font-bold tracking-wide text-foreground">{c.code}</p>
                          <button onClick={() => copy(c.code)} title="Copy code" className="text-muted-foreground hover:text-foreground">
                            {copied === c.code ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        {c.description && <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-muted-foreground">{c.description}</p>}
                        {c.created_at && <p className="text-[10px] text-muted-foreground/70">created {relativeTime(c.created_at)}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[13px] font-medium">{discountText(c)}</p>
                        {c.min_order_inr ? <p className="text-[11px] text-muted-foreground">min order {inr(c.min_order_inr)}</p> : null}
                      </td>
                      <td className="px-5 py-4 text-[11px] text-muted-foreground">
                        <p className="flex items-center gap-1.5 text-[12px] text-foreground">
                          {c.org_ids?.length
                            ? <><Building2 className="h-3.5 w-3.5" /> {c.org_ids.length === 1 ? (orgName.get(c.org_ids[0]) ?? '1 client') : `${c.org_ids.length} clients`}</>
                            : <><Globe2 className="h-3.5 w-3.5" /> Public</>}
                        </p>
                        <p>{c.plan_codes?.length ? c.plan_codes.map((p) => planName.get(p) ?? p).join(', ') : 'All plans'}</p>
                        {c.first_purchase_only && <p>First plan only</p>}
                      </td>
                      <td className="px-5 py-4 text-[11px] text-muted-foreground">
                        {c.valid_from || c.valid_until ? <>{prettyDate(c.valid_from)} → {prettyDate(c.valid_until)}</> : 'No dates'}
                      </td>
                      <td className="px-5 py-4 text-[12px]">
                        <p className="tabular font-semibold">{c.uses}{c.max_redemptions != null ? ` / ${c.max_redemptions}` : ''}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {c.max_per_org != null ? `${c.max_per_org} per client` : 'no per-client limit'} · saved {inr(c.total_discount_inr)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-center"><StatusPill tone={st.tone} dot>{st.label}</StatusPill></td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <ActionButton icon={Pencil} label="Edit" onClick={() => setDialog({ kind: 'edit', coupon: c })} />
                          <ActionButton icon={CopyPlus} label="Duplicate" onClick={() => setDialog({ kind: 'duplicate', from: c })} />
                          <ActionButton icon={History} label="Uses" onClick={() => setHistoryFor(c)} />
                          <ActionButton
                            icon={busy ? Loader2 : c.is_active ? Pause : Play} spin={busy}
                            label={c.is_active ? 'Pause' : 'Activate'} disabled={busy}
                            onClick={() => toggleMutation.mutate(c)}
                          />
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

      <CouponDialog mode={dialog} plans={plans} orgs={orgs} onClose={() => setDialog(null)} />
      <RedemptionsDialog coupon={historyFor} onClose={() => setHistoryFor(null)} />
    </AdminLayout>
  );
}

function ActionButton({ icon: Icon, label, onClick, disabled, spin }: {
  icon: typeof Pencil; label: string; onClick: () => void; disabled?: boolean; spin?: boolean;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      <Icon className={cn('h-3.5 w-3.5', spin && 'animate-spin')} /> {label}
    </button>
  );
}

// ─── Create / edit / duplicate ───────────────────────────────────────────

function CouponDialog({ mode, plans, orgs, onClose }: {
  mode: DialogMode | null; plans: BillingPlanOption[]; orgs: ClientOption[]; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);
  const [openedFor, setOpenedFor] = useState<DialogMode | null>(null);

  // Load the form whenever the dialog opens for something new.
  if (mode !== openedFor) {
    setOpenedFor(mode);
    if (mode?.kind === 'edit') setForm(fromCoupon(mode.coupon));
    else if (mode?.kind === 'duplicate') setForm(fromCoupon(mode.from, `${mode.from.code}2`));
    else if (mode) setForm(EMPTY);
  }

  const editing = mode?.kind === 'edit' ? mode.coupon : null;
  // A used coupon's discount is part of invoices already issued.
  const locked = !!editing && editing.uses > 0;

  const save = useMutation({
    mutationFn: async (f: Form) => {
      if (editing) {
        return couponsApi.update(editing.id, { ...commonFields(f), ...(locked ? {} : discountFields(f)) });
      }
      const input: CouponInput = {
        code: f.code.trim().toUpperCase(), ...discountFields(f), ...commonFields(f), is_active: true,
      };
      return couponsApi.create(input);
    },
    onSuccess: (c) => {
      toast.success(editing ? `${c.code} saved` : `Coupon ${c.code} created`);
      qc.invalidateQueries({ queryKey: qk.coupons });
      onClose();
    },
    onError: (err: ApiError) => toast.error(err?.detail || 'Could not save the coupon'),
  });

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleIn = (key: 'plan_codes' | 'org_ids', value: string) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value] }));

  const error = formError(form, locked);
  const title = editing ? `Edit ${editing.code}` : mode?.kind === 'duplicate' ? `Duplicate ${mode.from.code}` : 'New coupon';

  return (
    <Dialog open={!!mode} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto custom-scrollbar border-border/60 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg"><Ticket className="h-5 w-5 text-primary" /> {title}</DialogTitle>
          <DialogDescription>
            Works on plan purchases and renewals only (not seat add-ons or top-ups), for one payment.
            The discount is taken before GST and always leaves at least ₹1 to pay.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); if (!error) save.mutate(form); }} className="space-y-5 pt-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Code" required value={form.code} disabled={!!editing}
              onChange={(v) => set('code', v.toUpperCase())} placeholder="LAUNCH20" className="font-mono uppercase"
            />
            <Field label="Internal note" value={form.description} onChange={(v) => set('description', v)} placeholder="e.g. Diwali campaign" />
          </div>
          {editing && <p className="-mt-3 text-[11px] text-muted-foreground">Codes can't be renamed — duplicate it to use a new code.</p>}

          <div>
            <label className="field-label flex items-center gap-1.5">
              Discount {locked && <span className="inline-flex items-center gap-1 text-amber-400"><Lock className="h-3 w-3" /> locked — used {editing?.uses} times; duplicate to change it</span>}
            </label>
            <div className="flex gap-2">
              {(['percent', 'fixed'] as const).map((t) => (
                <button
                  key={t} type="button" disabled={locked} onClick={() => set('discount_type', t)}
                  className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-60',
                    form.discount_type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground')}
                >
                  {t === 'percent' ? <><Percent className="h-3.5 w-3.5" /> Percentage</> : <><IndianRupee className="h-3.5 w-3.5" /> Fixed amount</>}
                </button>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {form.discount_type === 'percent' ? (
                <>
                  <Field label="% off" required type="number" disabled={locked} value={form.percent_off} onChange={(v) => set('percent_off', v)} />
                  <Field label="Max discount (₹)" type="number" disabled={locked} value={form.max_discount_inr} onChange={(v) => set('max_discount_inr', v)} placeholder="No cap" />
                </>
              ) : (
                <Field label="₹ off" required type="number" disabled={locked} value={form.amount_off_inr} onChange={(v) => set('amount_off_inr', v)} />
              )}
              <Field label="Min order before GST (₹)" type="number" value={form.min_order_inr} onChange={(v) => set('min_order_inr', v)} placeholder="Any" />
            </div>
          </div>

          <div>
            <label className="field-label">Who can use it</label>
            <div className="flex gap-2">
              {(['public', 'specific'] as const).map((a) => (
                <button
                  key={a} type="button" onClick={() => set('audience', a)}
                  className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold',
                    form.audience === a ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground')}
                >
                  {a === 'public' ? <><Globe2 className="h-3.5 w-3.5" /> Anyone with the code</> : <><Building2 className="h-3.5 w-3.5" /> Specific clients</>}
                </button>
              ))}
            </div>
            {form.audience === 'specific' && (
              <div className="mt-2 max-h-40 overflow-y-auto custom-scrollbar rounded-lg border border-border/60 p-2">
                {orgs.length === 0 ? <p className="px-1 text-xs text-muted-foreground">No clients yet.</p> : orgs.map((o) => (
                  <label key={o.org_id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-muted/30">
                    <input type="checkbox" checked={form.org_ids.includes(o.org_id)} onChange={() => toggleIn('org_ids', o.org_id)} />
                    {o.company_name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="field-label">Plans (none ticked = every plan)</label>
            <div className="flex flex-wrap gap-2">
              {plans.map((p) => (
                <label key={p.plan_code} className={cn('flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs',
                  form.plan_codes.includes(p.plan_code) ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground')}>
                  <input type="checkbox" className="hidden" checked={form.plan_codes.includes(p.plan_code)} onChange={() => toggleIn('plan_codes', p.plan_code)} />
                  {p.plan_name}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Total uses" type="number" value={form.max_redemptions} onChange={(v) => set('max_redemptions', v)} placeholder="Unlimited" />
            <Field label="Uses per client" type="number" value={form.max_per_org} onChange={(v) => set('max_per_org', v)} placeholder="Unlimited" />
            <Field label="Valid from" type="date" value={form.valid_from} onChange={(v) => set('valid_from', v)} />
            <Field label="Valid until" type="date" value={form.valid_until} onChange={(v) => set('valid_until', v)} />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={form.first_purchase_only} onChange={(e) => set('first_purchase_only', e.target.checked)} />
            Only for a client's first plan purchase
          </label>

          {error && form.code && <p className="text-xs text-amber-400">{error}</p>}

          <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-border/70 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button
              type="submit" disabled={!!error || save.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:shadow-glow disabled:opacity-50"
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? 'Save changes' : 'Create coupon'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Uses ─────────────────────────────────────────────────────────────────

function RedemptionsDialog({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const { data = [], isLoading } = useQuery({
    queryKey: qk.couponRedemptions(coupon?.id),
    queryFn: () => couponsApi.redemptions(coupon!.id),
    enabled: !!coupon,
  });
  return (
    <Dialog open={!!coupon} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto custom-scrollbar border-border/60 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg"><History className="h-5 w-5 text-primary" /> {coupon?.code} — uses</DialogTitle>
          <DialogDescription>Paid purchases that used this coupon, newest first.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Not used yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Client</th><th className="py-2">Invoice</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Discount</th><th className="py-2 text-right">Paid (incl. GST)</th></tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {data.map((r) => (
                <tr key={r.purchase_id}>
                  <td className="py-2.5">
                    <p className="text-[13px] font-medium">{r.org_name ?? '—'}</p>
                    <p className="text-[11px] text-muted-foreground">{relativeTime(r.paid_at)}{r.description ? ` · ${r.description}` : ''}</p>
                  </td>
                  <td className="py-2.5 font-mono text-[11px]">{r.invoice_number ?? '—'}</td>
                  <td className="py-2.5 text-right tabular">{inr(r.list_amount_inr ?? r.amount_inr)}</td>
                  <td className="py-2.5 text-right tabular text-emerald-400">−{inr(r.discount_inr)}</td>
                  <td className="py-2.5 text-right tabular font-semibold">{inr(r.total_amount_inr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, required, type = 'text', placeholder, className, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; placeholder?: string; className?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="field-label">{label} {required && <span className="text-primary">*</span>}</label>
      <input
        type={type} value={value} placeholder={placeholder} required={required} disabled={disabled}
        min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined}
        onChange={(e) => onChange(e.target.value)} className={cn('field disabled:opacity-60', className)}
      />
    </div>
  );
}
