import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { adminSupportApi, SupportTicket } from '@/services/api';
import { toast } from 'sonner';
import { LifeBuoy, Send, Lock, EyeOff, Search, FilterX, Bug, Lightbulb, CreditCard, HelpCircle, MessageSquare } from 'lucide-react';

export default function Helpdesk() {
  const qc = useQueryClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // State
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: tickets, isLoading: isTicketsLoading } = useQuery({
    queryKey: ['adminTickets'],
    queryFn: adminSupportApi.list,
  });

  const { data: messages } = useQuery({
    queryKey: ['adminTicketMessages', selectedTicket?.id],
    queryFn: () => adminSupportApi.getMessages(selectedTicket!.id),
    enabled: !!selectedTicket?.id,
    refetchInterval: 60000, 
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── FILTER LOGIC ──────────────────────────────────────────────────────────
  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    
    return tickets.filter(t => {
      const searchLower = searchQuery.toLowerCase();
      const orgName = t.org_name?.toLowerCase() || '';
      const matchesSearch = 
        t.subject.toLowerCase().includes(searchLower) || 
        t.ticket_number.toLowerCase().includes(searchLower) ||
        orgName.includes(searchLower);

      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;

      let matchesTime = true;
      if (timeFilter !== 'all') {
        const ticketDate = new Date(t.created_at);
        const now = new Date();
        if (timeFilter === 'today') {
          matchesTime = ticketDate.toDateString() === now.toDateString();
        } else if (timeFilter === 'week') {
          matchesTime = ticketDate >= new Date(now.setDate(now.getDate() - 7));
        } else if (timeFilter === 'month') {
          matchesTime = ticketDate >= new Date(now.setDate(now.getDate() - 30));
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesTime;
    });
  }, [tickets, searchQuery, statusFilter, timeFilter, categoryFilter]);

  // ─── MUTATIONS ─────────────────────────────────────────────────────────────
  const replyMutation = useMutation({
    mutationFn: (data: {content: string, is_internal: boolean}) => adminSupportApi.reply(selectedTicket!.id, data),
    onSuccess: () => {
      setReplyText('');
      setIsInternal(false);
      qc.invalidateQueries({ queryKey: ['adminTicketMessages', selectedTicket?.id] });
      qc.invalidateQueries({ queryKey: ['adminTickets'] });
    }
  });

  const statusMutation = useMutation({
    mutationFn: (status: any) => adminSupportApi.updateStatus(selectedTicket!.id, status),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['adminTickets'] });
      if (selectedTicket) setSelectedTicket({...selectedTicket, status: statusMutation.variables as any});
    }
  });

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate({ content: replyText, is_internal: isInternal });
  };

  // ─── UI HELPERS ────────────────────────────────────────────────────────────
  const getStatusColor = (s: string) => {
    switch(s) {
      case 'open': return 'bg-primary/10 text-primary border-primary/20';
      case 'in_progress': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'resolved': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'waiting_for_client': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'closed': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      case 'reopened': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const getCategoryDetails = (c: string) => {
    switch(c) {
      case 'bug': return { icon: <Bug className="w-3.5 h-3.5 text-red-400" />, label: "Bug / Issue" };
      case 'billing': return { icon: <CreditCard className="w-3.5 h-3.5 text-emerald-400" />, label: "Billing" };
      case 'feature_request': return { icon: <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />, label: "Feature Req" };
      case 'how_to': return { icon: <HelpCircle className="w-3.5 h-3.5 text-blue-400" />, label: "How-To" };
      default: return { icon: <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />, label: "General" };
    }
  };

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-120px)] flex gap-6">
        
        {/* ─── LEFT COLUMN: TICKET LIST & FILTERS ─── */}
        <div className="w-[380px] rounded-2xl border border-border/60 bg-card/50 flex flex-col overflow-hidden shadow-sm shrink-0">
          
          <div className="p-4 border-b border-border/40 bg-muted/20 shrink-0">
            <h3 className="font-bold flex items-center gap-2 mb-4"><LifeBuoy className="w-5 h-5 text-primary" /> Global Support Queue</h3>
            
            {/* Filters */}
            <div className="space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input 
                  placeholder="Search Ticket ID, Subject, Org..." 
                  className="w-full pl-9 bg-background border border-border rounded-lg h-9 text-sm outline-none focus:border-primary transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select 
                  className="bg-background border border-border rounded-md text-xs px-2 py-1.5 flex-1 outline-none text-foreground focus:border-primary"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="bug">Bugs</option>
                  <option value="feature_request">Feature Req</option>
                  <option value="billing">Billing</option>
                  <option value="how_to">How To</option>
                </select>
                <select 
                  className="bg-background border border-border rounded-md text-xs px-2 py-1.5 flex-1 outline-none text-foreground focus:border-primary"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Past 7 Days</option>
                </select>
              </div>
              <select 
                className="w-full bg-background border border-border rounded-md text-xs px-2 py-1.5 outline-none text-foreground focus:border-primary"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_for_client">Waiting for Client</option>
                <option value="resolved">Resolved</option>
                <option value="reopened">Reopened</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {isTicketsLoading ? (
              <p className="p-4 text-center text-muted-foreground text-sm mt-10">Loading tickets...</p>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center mt-10">
                <FilterX className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">No tickets match filters.</p>
                <button className="text-primary text-sm mt-2 hover:underline" onClick={() => {setSearchQuery(''); setStatusFilter('all'); setTimeFilter('all'); setCategoryFilter('all');}}>
                  Clear Filters
                </button>
              </div>
            ) : (
              filteredTickets.map(t => {
                const cat = getCategoryDetails(t.category);
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`w-full text-left p-3.5 rounded-xl transition-all border ${selectedTicket?.id === t.id ? 'bg-primary/10 border-primary/30' : 'border-transparent hover:bg-muted/50'}`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[11px] font-mono text-muted-foreground">{t.ticket_number}</span>
                      <span className={`text-[9px] font-bold tracking-wide uppercase px-2 py-0.5 rounded border ${getStatusColor(t.status)}`}>
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm text-foreground line-clamp-1 mb-2 pr-2">{t.subject}</h4>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {cat.icon} <span>{cat.label}</span>
                      </div>
                      <span className="text-[10px] bg-background border border-border px-1.5 py-0.5 rounded-sm max-w-[120px] truncate text-muted-foreground">
                        {t.org_name || 'Unknown Org'}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT COLUMN: CHAT VIEW ─── */}
        <div className="flex-1 rounded-2xl border border-border/60 bg-card/50 flex flex-col overflow-hidden relative shadow-lg">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="p-5 border-b border-border/40 bg-muted/20 flex justify-between items-center shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">{selectedTicket.ticket_number}</span>
                    <span className="flex items-center gap-1 text-xs font-medium text-zinc-300">
                      {getCategoryDetails(selectedTicket.category).icon} {getCategoryDetails(selectedTicket.category).label}
                    </span>
                  </div>
                  <h3 className="font-bold text-xl leading-tight text-zinc-100">{selectedTicket.subject}</h3>
                  <p className="text-xs text-muted-foreground mt-1.5">Organization: <span className="text-foreground font-medium">{selectedTicket.org_name || selectedTicket.org_id}</span></p>
                </div>
                
                {/* Admin Status Controls */}
                <div className="flex items-center gap-2 bg-background/50 p-2 rounded-lg border border-border">
                  <span className="text-xs font-medium text-muted-foreground">Status:</span>
                  <select 
                    value={selectedTicket.status} 
                    onChange={e => statusMutation.mutate(e.target.value)}
                    className="bg-transparent text-sm font-bold outline-none cursor-pointer focus:text-primary transition-colors"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_for_client">Waiting for Client</option>
                    <option value="resolved">Mark Resolved</option>
                  </select>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6 bg-black/10">
                
                {/* Client Original Issue (Left Side) */}
                <div className="w-full flex justify-start">
                  <div className="flex flex-col gap-1 max-w-[80%]">
                    <span className="text-[10px] text-muted-foreground px-1">Client • Original Request • {new Date(selectedTicket.created_at).toLocaleString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <div className="p-4 rounded-2xl rounded-tl-sm text-sm border border-border bg-muted/30 whitespace-pre-wrap leading-relaxed shadow-sm">
                      {selectedTicket.description}
                    </div>
                  </div>
                </div>

                {/* Message History */}
                {messages?.map(msg => {
                  // Important: Check for both 'Superadmin' and 'admin' because of the Python Enum mismatch
                  const isAdmin = msg.sender_type === 'admin' || msg.sender_type === 'Superadmin';
                  
                  return (
                    <div key={msg.id} className={`w-full flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className="flex flex-col gap-1 max-w-[80%]">
                        <span className={`text-[10px] text-muted-foreground px-1 flex items-center gap-1 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          {msg.is_internal && <EyeOff className="w-3 h-3 text-yellow-500" />}
                          {isAdmin ? 'You (Admin)' : 'Client'} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <div className={`p-4 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm ${
                          isAdmin 
                            ? (msg.is_internal 
                                ? 'bg-yellow-500 text-yellow-950 rounded-tr-sm border border-yellow-600 font-medium' 
                                : 'bg-primary text-primary-foreground rounded-tr-sm') 
                            : 'border border-border bg-muted/30 rounded-tl-sm text-foreground'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-border/40 bg-muted/10 shrink-0">
                <form onSubmit={handleReplySubmit} className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <button 
                      type="button" 
                      onClick={() => setIsInternal(!isInternal)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${isInternal ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}
                    >
                      {isInternal ? <Lock className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {isInternal ? 'Internal Note Active (Client will NOT see this)' : 'Public Reply'}
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      placeholder={isInternal ? "Type a dev note..." : "Reply to client..."}
                      className="flex-1 bg-background border border-border rounded-lg px-4 py-3 outline-none focus:border-primary transition-colors text-sm"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                    />
                    <button 
                      type="submit" 
                      disabled={!replyText.trim() || replyMutation.isPending}
                      className={`px-8 rounded-lg font-medium transition-all flex items-center justify-center disabled:opacity-50 ${isInternal ? 'bg-yellow-500 text-yellow-950 hover:bg-yellow-400' : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20'}`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center mb-4 shadow-sm">
                <LifeBuoy className="w-8 h-8 opacity-50 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Select a Ticket</h3>
              <p className="text-sm mt-2 max-w-sm">Choose a ticket from the queue to view the conversation, change status, or reply to the client.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}