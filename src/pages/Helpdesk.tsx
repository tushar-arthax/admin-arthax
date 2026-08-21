import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bug, CreditCard, EyeOff, FilterX, HelpCircle, Inbox, Lightbulb, LifeBuoy, Lock,
  MessageSquare, Search, Send, Loader2, Building2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { EmptyState } from '@/components/admin/EmptyState';
import { StatusPill, Tone } from '@/components/admin/StatusPill';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  adminSupportApi, SupportMessage, SupportTicket, TicketStatus,
} from '@/services/api';
import { qk } from '@/lib/queryKeys';
import { clockTime, initials, nowNaive, relativeTime, titleCase } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_TONE: Record<string, Tone> = {
  open: 'primary',
  in_progress: 'warning',
  waiting_for_client: 'purple',
  resolved: 'success',
  closed: 'neutral',
  reopened: 'danger',
};

const PRIORITY_TONE: Record<string, Tone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const PRIORITY_BAR: Record<string, string> = {
  low: 'bg-zinc-600',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  critical: 'bg-red-500',
};

function categoryOf(category: string) {
  switch (category) {
    case 'bug': return { icon: Bug, label: 'Bug', className: 'text-red-400' };
    case 'billing': return { icon: CreditCard, label: 'Billing', className: 'text-emerald-400' };
    case 'feature_request': return { icon: Lightbulb, label: 'Feature', className: 'text-amber-400' };
    case 'how_to': return { icon: HelpCircle, label: 'How-to', className: 'text-blue-400' };
    default: return { icon: MessageSquare, label: 'General', className: 'text-zinc-400' };
  }
}

/** Day label above the first message of each calendar day. */
function dayLabel(ts: string): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Helpdesk() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: tickets, isLoading: isTicketsLoading } = useQuery({
    queryKey: qk.tickets,
    queryFn: adminSupportApi.list,
  });

  // The open ticket is looked up from the list cache rather than copied into
  // component state. A status change written into that cache is therefore
  // visible in the header and the queue row at the same instant, with no second
  // copy to keep in step.
  const selectedTicket = useMemo(
    () => tickets?.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: qk.ticketMessages(selectedId ?? ''),
    queryFn: () => adminSupportApi.getMessages(selectedId as string),
    enabled: !!selectedId,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedId]);

  // ─── Filters ───────────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    const searchLower = searchQuery.trim().toLowerCase();

    return tickets.filter((t) => {
      const matchesSearch =
        !searchLower ||
        t.subject.toLowerCase().includes(searchLower) ||
        t.ticket_number.toLowerCase().includes(searchLower) ||
        (t.org_name?.toLowerCase() || '').includes(searchLower);

      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

      let matchesTime = true;
      if (timeFilter !== 'all') {
        const ticketDate = new Date(t.created_at).getTime();
        const day = 86_400_000;
        if (timeFilter === 'today') {
          matchesTime = new Date(t.created_at).toDateString() === new Date().toDateString();
        } else if (timeFilter === 'week') {
          matchesTime = ticketDate >= Date.now() - 7 * day;
        } else if (timeFilter === 'month') {
          matchesTime = ticketDate >= Date.now() - 30 * day;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesTime;
    });
  }, [tickets, searchQuery, statusFilter, timeFilter, categoryFilter]);

  // Inbox behaviour: land on the top of the queue instead of an empty pane.
  useEffect(() => {
    if (!selectedId && filteredTickets.length > 0) {
      setSelectedId(filteredTickets[0].id);
    }
  }, [filteredTickets, selectedId]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTimeFilter('all');
    setCategoryFilter('all');
  };

  // ─── Mutations ─────────────────────────────────────────────────────────
  // Both write through the cache: the reply appears the moment it is sent and
  // is then reconciled with the row the server actually stored.
  const replyMutation = useMutation({
    mutationFn: (data: { content: string; is_internal: boolean }) =>
      adminSupportApi.reply(selectedId as string, data),

    onMutate: async (data) => {
      const key = qk.ticketMessages(selectedId as string);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<SupportMessage[]>(key);

      const pendingId = `pending-${Date.now()}`;
      const optimistic: SupportMessage = {
        id: pendingId,
        ticket_id: selectedId as string,
        sender_type: 'Superadmin',
        sender_id: user?.id ?? '',
        sender_name: user?.full_name ?? 'You',
        content: data.content,
        is_internal: data.is_internal,
        created_at: nowNaive(),
      };

      qc.setQueryData<SupportMessage[]>(key, [...(previous ?? []), optimistic]);
      return { previous, pendingId, key };
    },

    onSuccess: (saved, _data, ctx) => {
      // Swap the placeholder for the stored row — same id, timestamps and
      // sender the rest of the platform will see.
      qc.setQueryData<SupportMessage[]>(ctx!.key, (curr = []) =>
        curr.map((m) => (m.id === ctx!.pendingId ? saved : m)),
      );
    },

    onError: (err: any, data, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous);
      setReplyText(data.content); // give the text back rather than losing it
      toast.error(err?.detail || 'Reply failed to send');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: TicketStatus) => adminSupportApi.updateStatus(selectedId as string, status),

    onMutate: async (status) => {
      await qc.cancelQueries({ queryKey: qk.tickets });
      const previous = qc.getQueryData<SupportTicket[]>(qk.tickets);
      qc.setQueryData<SupportTicket[]>(qk.tickets, (curr = []) =>
        curr.map((t) => (t.id === selectedId ? { ...t, status } : t)),
      );
      return { previous };
    },

    onSuccess: (res) => {
      toast.success(res?.message || 'Status updated');
      // The queue counters on the sidebar come from the analytics cache — let
      // them catch up once, on this event, rather than on a timer.
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },

    onError: (err: any, _status, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.tickets, ctx.previous);
      toast.error(err?.detail || 'Could not update status');
    },
  });

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = replyText.trim();
    if (!content || !selectedId) return;
    setReplyText('');
    const internal = isInternal;
    setIsInternal(false);
    replyMutation.mutate({ content, is_internal: internal });
  };

  const queueCounts = useMemo(() => {
    const open = (tickets ?? []).filter((t) =>
      ['open', 'in_progress', 'reopened'].includes(t.status),
    ).length;
    return { open, total: tickets?.length ?? 0 };
  }, [tickets]);

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-8rem)] min-h-[540px] flex-col gap-5 lg:flex-row">
        {/* ── Queue ──────────────────────────────────────────────────── */}
        <div className="panel flex w-full shrink-0 flex-col overflow-hidden max-lg:h-[45%] lg:w-[340px] xl:w-[368px]">
          <div className="shrink-0 border-b border-border/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <LifeBuoy className="h-4 w-4 text-primary" /> Support queue
              </h2>
              <StatusPill tone={queueCounts.open > 0 ? 'warning' : 'success'} dot pulse={queueCounts.open > 0}>
                {queueCounts.open} open
              </StatusPill>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Search ticket, subject or org…"
                  className="field h-9 py-0 pl-9 text-[13px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-8 flex-1 border-border/70 bg-background/60 text-[11px]">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="bug">Bugs</SelectItem>
                    <SelectItem value="feature_request">Feature request</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="how_to">How-to</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="h-8 flex-1 border-border/70 bg-background/60 text-[11px]">
                    <SelectValue placeholder="All time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Past 7 days</SelectItem>
                    <SelectItem value="month">Past 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-full border-border/70 bg-background/60 text-[11px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="waiting_for_client">Waiting for client</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="reopened">Reopened</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto p-2.5">
            {isTicketsLoading ? (
              [0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="shimmer h-[86px] rounded-xl bg-muted/20" />
              ))
            ) : filteredTickets.length === 0 ? (
              <EmptyState
                icon={FilterX}
                title="Nothing matches"
                description="No ticket in the queue fits the current filters."
                action={
                  <button
                    onClick={clearFilters}
                    className="rounded-lg border border-border/70 px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    Clear filters
                  </button>
                }
              />
            ) : (
              filteredTickets.map((t) => {
                const cat = categoryOf(t.category);
                const active = selectedId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      'group relative w-full overflow-hidden rounded-xl border p-3 pl-4 text-left transition-all duration-200',
                      active
                        ? 'border-primary/30 bg-primary/[0.07]'
                        : 'border-transparent hover:border-border/60 hover:bg-muted/30',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute inset-y-2 left-1 w-[3px] rounded-full transition-opacity',
                        PRIORITY_BAR[t.priority] ?? 'bg-zinc-700',
                        active ? 'opacity-100' : 'opacity-50 group-hover:opacity-90',
                      )}
                    />

                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">{t.ticket_number}</span>
                      <StatusPill tone={STATUS_TONE[t.status] ?? 'neutral'}>
                        {titleCase(t.status)}
                      </StatusPill>
                    </div>

                    <h3 className="mb-2 line-clamp-1 text-[13px] font-semibold text-foreground">{t.subject}</h3>

                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('flex items-center gap-1.5 text-[11px]', cat.className)}>
                        <cat.icon className="h-3 w-3" /> {cat.label}
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="max-w-[110px] truncate">{t.org_name || 'Unknown org'}</span>
                        <span className="text-muted-foreground/40">·</span>
                        {relativeTime(t.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Conversation ───────────────────────────────────────────── */}
        <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
          {selectedTicket ? (
            <>
              <header className="shrink-0 border-b border-border/50 bg-gradient-to-b from-white/[0.02] to-transparent px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border/70 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {selectedTicket.ticket_number}
                      </span>
                      <StatusPill tone={PRIORITY_TONE[selectedTicket.priority] ?? 'neutral'}>
                        {selectedTicket.priority}
                      </StatusPill>
                      {(() => {
                        const cat = categoryOf(selectedTicket.category);
                        return (
                          <span className={cn('flex items-center gap-1 text-[11px] font-medium', cat.className)}>
                            <cat.icon className="h-3 w-3" /> {cat.label}
                          </span>
                        );
                      })()}
                    </div>
                    <h1 className="truncate text-lg font-bold leading-tight text-foreground">
                      {selectedTicket.subject}
                    </h1>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span className="font-medium text-foreground">
                          {selectedTicket.org_name || selectedTicket.org_id}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> raised {relativeTime(selectedTicket.created_at)}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border/70 bg-background/50 p-1.5 pl-3">
                    <span className="text-[11px] font-medium text-muted-foreground">Status</span>
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(val) => statusMutation.mutate(val as TicketStatus)}
                    >
                      <SelectTrigger className="h-8 w-[168px] gap-2 border-none bg-transparent text-sm font-semibold text-primary shadow-none focus:ring-0 focus:ring-offset-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="waiting_for_client">Waiting for client</SelectItem>
                        <SelectItem value="resolved">Mark resolved</SelectItem>
                        <SelectItem value="closed">Close ticket</SelectItem>
                      </SelectContent>
                    </Select>
                    {statusMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  </div>
                </div>
              </header>

              <div className="custom-scrollbar flex flex-1 flex-col gap-5 overflow-y-auto bg-black/20 p-5">
                {/* The original request always leads the thread. */}
                <MessageBubble
                  side="left"
                  author="Client"
                  meta={`Original request · ${clockTime(selectedTicket.created_at)}`}
                  body={selectedTicket.description}
                  avatar={initials(selectedTicket.org_name || 'Client')}
                />

                {messagesLoading && !messages ? (
                  <div className="space-y-3">
                    <div className="shimmer h-16 w-2/3 rounded-2xl bg-muted/20" />
                    <div className="shimmer ml-auto h-16 w-1/2 rounded-2xl bg-muted/20" />
                  </div>
                ) : (
                  messages?.map((msg, i) => {
                    const isAdmin = msg.sender_type === 'admin' || msg.sender_type === 'Superadmin';
                    const prev = i > 0 ? messages[i - 1] : null;
                    const showDay =
                      !prev || dayLabel(prev.created_at) !== dayLabel(msg.created_at);
                    const pending = msg.id.startsWith('pending-');

                    return (
                      <div key={msg.id} className="contents">
                        {showDay && (
                          <div className="my-1 flex items-center gap-3">
                            <div className="h-px flex-1 bg-border/50" />
                            <span className="rounded-full border border-border/60 bg-surface-2/60 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {dayLabel(msg.created_at)}
                            </span>
                            <div className="h-px flex-1 bg-border/50" />
                          </div>
                        )}
                        <MessageBubble
                          side={isAdmin ? 'right' : 'left'}
                          author={isAdmin ? msg.sender_name || 'You' : msg.sender_name || 'Client'}
                          meta={clockTime(msg.created_at)}
                          body={msg.content}
                          internal={msg.is_internal}
                          pending={pending}
                          avatar={initials(msg.sender_name || (isAdmin ? 'Admin' : 'Client'))}
                        />
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              <form
                onSubmit={handleReplySubmit}
                className="shrink-0 space-y-2.5 border-t border-border/50 bg-surface-2/30 p-4"
              >
                <button
                  type="button"
                  onClick={() => setIsInternal((v) => !v)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all',
                    isInternal
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-border/70 bg-background/60 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {isInternal ? <Lock className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {isInternal ? 'Internal note — the client will not see this' : 'Public reply'}
                </button>

                <div className="flex items-end gap-2">
                  <textarea
                    rows={1}
                    placeholder={isInternal ? 'Type a note for the team…' : 'Reply to the client…'}
                    className="field max-h-32 min-h-[46px] flex-1 resize-none py-3 text-sm"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReplySubmit(e);
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className={cn(
                      'flex h-[46px] items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-all disabled:opacity-40',
                      isInternal
                        ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                        : 'bg-primary text-primary-foreground hover:shadow-glow',
                    )}
                  >
                    {replyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="max-sm:hidden">Send</span>
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  Enter to send · Shift + Enter for a new line
                </p>
              </form>
            </>
          ) : (
            <EmptyState
              className="flex-1"
              icon={Inbox}
              title="No ticket selected"
              description="Pick a ticket from the queue to read the thread, change its status or reply to the client."
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

interface BubbleProps {
  side: 'left' | 'right';
  author: string;
  meta: string;
  body: string;
  avatar: string;
  internal?: boolean;
  pending?: boolean;
}

function MessageBubble({ side, author, meta, body, avatar, internal, pending }: BubbleProps) {
  const right = side === 'right';
  return (
    <div className={cn('flex w-full items-end gap-2.5', right ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold',
          right ? 'bg-primary/20 text-primary' : 'bg-muted/60 text-muted-foreground',
        )}
      >
        {avatar}
      </div>

      <div className={cn('flex max-w-[78%] flex-col gap-1', right && 'items-end')}>
        <span className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
          {internal && <Lock className="h-2.5 w-2.5 text-amber-400" />}
          <span className="font-medium text-muted-foreground/90">{author}</span>
          <span className="text-muted-foreground/50">·</span>
          {pending ? <span className="text-primary/70">sending…</span> : meta}
        </span>

        <div
          className={cn(
            'whitespace-pre-wrap rounded-2xl px-4 py-3 text-[13px] leading-relaxed shadow-sm transition-opacity',
            pending && 'opacity-60',
            right
              ? internal
                ? 'rounded-tr-sm border border-amber-600/60 bg-amber-500 font-medium text-amber-950'
                : 'rounded-tr-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm border border-border/60 bg-surface-2/70 text-foreground',
          )}
        >
          {body}
        </div>
      </div>
    </div>
  );
}
