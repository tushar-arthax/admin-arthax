import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { adminAnalyticsApi } from "@/services/api";
import { Users, Building2, LifeBuoy, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: adminAnalyticsApi.getDashboard,
    refetchInterval: 60000, // auto refresh every minute
  });

  if (isLoading || !data) {
    return (
      <AdminLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Safe extractors
  const pendingTickets = (data.helpdesk.by_status['open'] || 0) + (data.helpdesk.by_status['in_progress'] || 0) + (data.helpdesk.by_status['reopened'] || 0);
  const resolvedTickets = (data.helpdesk.by_status['resolved'] || 0) + (data.helpdesk.by_status['closed'] || 0);

  const stats = [
    { title: "Total Users", value: data.users.total, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Organizations", value: data.organizations.total, icon: Building2, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Pending Tickets", value: pendingTickets, icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Resolved Tickets", value: resolvedTickets, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-10">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LifeBuoy className="w-8 h-8 text-primary" /> System Overview
          </h1>
          <p className="text-muted-foreground mt-1">Real-time metrics for ArthaX infrastructure and support.</p>
        </div>

        {/* Top Stat Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.title} className="rounded-2xl border border-border/60 bg-card/50 p-6 transition-all hover:border-primary/20 hover:bg-card/80 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg} ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{s.title}</p>
                  <h3 className="text-2xl font-bold text-foreground mt-1">{s.value}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Middle Section: Chart & Breakdowns */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Main Chart (Spans 2 columns) */}
          <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/50 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">Ticket Velocity (30 Days)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.helpdesk.trends} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#52525b" 
                    fontSize={12} 
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                  />
                  <YAxis stroke="#52525b" fontSize={12} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '14px' }}
                  />
                  <Area type="monotone" dataKey="opened" name="Opened" stroke="#f97316" fillOpacity={1} fill="url(#colorOpened)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" fillOpacity={1} fill="url(#colorResolved)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Sidebars */}
          <div className="space-y-6">
            
            {/* Users Breakdown */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border/40 pb-2">Users by Role</h3>
              <div className="space-y-3">
                {Object.entries(data.users.by_role).sort((a,b) => b[1] - a[1]).map(([role, count]) => (
                  <div key={role} className="flex justify-between items-center">
                    <span className="text-sm text-foreground capitalize flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/50" />
                      {role.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-sm bg-muted/50 px-2 py-0.5 rounded-md border border-border">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ticket Status Breakdown */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border/40 pb-2">Tickets by Status</h3>
              <div className="space-y-3">
                {Object.entries(data.helpdesk.by_status).sort((a,b) => b[1] - a[1]).map(([status, count]) => {
                  let dotColor = "bg-zinc-500";
                  if (status === 'resolved' || status === 'closed') dotColor = "bg-green-500";
                  if (status === 'open' || status === 'in_progress') dotColor = "bg-yellow-500";
                  if (status === 'reopened') dotColor = "bg-red-500";

                  return (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm text-foreground capitalize flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                        {status.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-sm bg-muted/50 px-2 py-0.5 rounded-md border border-border">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </AdminLayout>
  );
}