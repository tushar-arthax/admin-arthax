import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { adminNotificationApi, adminClientsApi } from '@/services/api';
import { toast } from 'sonner';
import { 
  Bell, 
  Send, 
  History, 
  Globe, 
  Building2, 
  AlertTriangle, 
  Info, 
  Zap,
  Loader2,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminNotifications() {
  const qc = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    notification_type: 'information' as any,
    org_id: '' // Empty string means "Global/All"
  });

  // 1. Fetch History
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['adminNotificationHistory'],
    queryFn: () => adminNotificationApi.getHistory(50),
  });

  // 2. Fetch Organizations (for the dropdown)
  const { data: clients = [] } = useQuery({
    queryKey: ['onboardedClients'],
    queryFn: adminClientsApi.list,
  });

  // 3. Mutation to Send
  const sendMutation = useMutation({
    mutationFn: (data: any) => adminNotificationApi.send({
      ...data,
      org_id: data.org_id === '' ? null : data.org_id
    }),
    onSuccess: () => {
      toast.success("Notification Broadcasted Successfully!");
      qc.invalidateQueries({ queryKey: ['adminNotificationHistory'] });
      setFormData({ title: '', message: '', notification_type: 'information', org_id: '' });
    },
    onError: (err: any) => toast.error(err.detail || "Failed to send notification")
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return toast.error("Please fill all required fields");
    sendMutation.mutate(formData);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'system': return <Zap className="w-4 h-4 text-amber-500" />;
      case 'information': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" /> Communications Center
          </h1>
          <p className="text-muted-foreground mt-1">Broadcast system alerts and updates to specific organizations or the entire platform.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl sticky top-8">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" /> Create Broadcast
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Audience</label>
                  <select 
                    className="w-full mt-1.5 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    value={formData.org_id}
                    onChange={(e) => setFormData({...formData, org_id: e.target.value})}
                  >
                    <option value="">🌍 All Organizations (Global)</option>
                    {clients.map((c: any) => (
                      <option key={c.org_id} value={c.org_id}>🏢 {c.company_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</label>
                    <select 
                      className="w-full mt-1.5 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                      value={formData.notification_type}
                      onChange={(e) => setFormData({...formData, notification_type: e.target.value as any})}
                    >
                      <option value="information">Information</option>
                      <option value="alert">Critical Alert</option>
                      <option value="system">System Update</option>
                      <option value="admin">Admin Direct</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Title</label>
                  <input 
                    required
                    className="w-full mt-1.5 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g., Scheduled Maintenance"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Message Content</label>
                  <textarea 
                    required
                    rows={4}
                    className="w-full mt-1.5 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
                    placeholder="Describe the update in detail..."
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  />
                </div>

                <button 
                  type="submit"
                  disabled={sendMutation.isPending}
                  className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {sendMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Send Notification</>}
                </button>
              </form>
            </div>
          </div>

          {/* History Section */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-card/30 border border-border/60 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-muted-foreground" /> Broadcast History
                </h2>
                <div className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                  Showing Last 50 Logs
                </div>
              </div>

              <div className="space-y-4">
                {historyLoading ? (
                  <div className="text-center py-20 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading History...</div>
                ) : history.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-xl">No notifications sent yet.</div>
                ) : (
                  history.map((notif) => (
                    <div key={notif.id} className="group p-4 rounded-xl border border-border/40 bg-card/50 hover:border-primary/30 transition-all">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getIcon(notif.notification_type)}
                            <h3 className="font-bold text-foreground leading-none">{notif.title}</h3>
                          </div>
                          <p className="text-sm text-zinc-400 line-clamp-2">{notif.message}</p>
                        </div>
                        <div className="text-right shrink-0">
                           <div className="text-[10px] text-muted-foreground mb-1">
                              {format(new Date(notif.created_at), 'MMM dd, HH:mm')}
                           </div>
                           <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-tighter ${
                             notif.org_id ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                           }`}>
                             {notif.org_id ? 'Targeted' : 'Global'}
                           </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}