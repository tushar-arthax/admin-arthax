import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { adminClientsApi } from '@/services/api';
import { toast } from 'sonner';
import { 
  Building2, 
  Plus, 
  Server, 
  Briefcase, 
  FileText, 
  UserX, 
  UserCheck,
  Loader2,
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle
} from 'lucide-react';

type FilterStatus = 'all' | 'active' | 'suspended';

export default function Onboarding() {
  const qc = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterStatus>('all');

  const [formData, setFormData] = useState({
    company_name: '', admin_name: '', admin_email: '', admin_phone: '',
    business_type: '', gst_number: '', pan_number: '', industry: '', temporary_password: ''
  });

  // 1. Fetch Clients
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['onboardedClients'],
    queryFn: adminClientsApi.list,
  });

  // 2. Onboard Mutation
  const onboardMutation = useMutation({
    mutationFn: (data: any) => adminClientsApi.onboard(data),
    onSuccess: () => {
      toast.success("Client Workspace Provisioned Successfully!");
      qc.invalidateQueries({ queryKey: ['onboardedClients'] });
      setIsFormOpen(false);
      setFormData({
        company_name: '', admin_name: '', admin_email: '', admin_phone: '',
        business_type: '', gst_number: '', pan_number: '', industry: '', temporary_password: ''
      });
    },
    onError: (err: any) => toast.error(err.detail || "Failed to onboard client")
  });

  // 3. Deactivate Mutation (Cascading)
  const deactivateMutation = useMutation({
    mutationFn: (orgId: string) => adminClientsApi.deactivate(orgId),
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ['onboardedClients'] });
    },
    onError: (err: any) => toast.error(err.detail || "Failed to deactivate client")
  });

  // 4. Activate Mutation (Cascading)
  const activateMutation = useMutation({
    mutationFn: (orgId: string) => adminClientsApi.activate(orgId),
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ['onboardedClients'] });
    },
    onError: (err: any) => toast.error(err.detail || "Failed to activate client")
  });

  // 5. Filtering and Searching Logic
  const filteredClients = useMemo(() => {
    return clients.filter((client: any) => {
      const matchesSearch = 
        client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.admin_email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isSuspended = client.status === 'suspended';
      
      if (activeTab === 'active') return matchesSearch && !isSuspended;
      if (activeTab === 'suspended') return matchesSearch && isSuspended;
      return matchesSearch;
    });
  }, [clients, searchQuery, activeTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onboardMutation.mutate(formData);
  };

  const handleDeactivate = (orgId: string, companyName: string) => {
    if (window.confirm(`⚠️ DEACTIVATE "${companyName}"?\nThis blocks login for ALL users.`)) {
      deactivateMutation.mutate(orgId);
    }
  };

  const handleActivate = (orgId: string, companyName: string) => {
    if (window.confirm(`✅ RESTORE "${companyName}"?\nThis will re-enable login for all users.`)) {
      activateMutation.mutate(orgId);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-end bg-card/50 p-6 rounded-2xl border border-border/60 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" /> Client Provisioning
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Create and track ArthaX workspaces and manage global access control.</p>
          </div>
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all shadow-lg active:scale-95"
          >
            {isFormOpen ? 'Close Form' : <><Plus className="w-4 h-4" /> Provision New Client</>}
          </button>
        </div>

        {/* Slide-down Form */}
        {isFormOpen && (
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-primary">
                <Server className="w-5 h-5" /> Setup New Workspace Environment
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Org & Admin Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground border-b border-border/40 pb-2 mb-4 uppercase tracking-widest">Account & Admin Details</h3>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Company Name *</label>
                    <input required name="company_name" value={formData.company_name} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Admin Name *</label>
                      <input required name="admin_name" value={formData.admin_name} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Phone</label>
                      <input name="admin_phone" value={formData.admin_phone} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Admin Email (Primary Login) *</label>
                    <input required type="email" name="admin_email" value={formData.admin_email} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Temporary Password</label>
                    <input name="temporary_password" value={formData.temporary_password} onChange={handleInputChange} placeholder="Default: Admin@123" className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/30" />
                  </div>
                </div>

                {/* Legal Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground border-b border-border/40 pb-2 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Compliance & Legal (KYC)
                  </h3>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Business Structure</label>
                    <select name="business_type" value={formData.business_type} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                      <option value="">Select Structure...</option>
                      <option value="Private Limited">Private Limited</option>
                      <option value="LLP">LLP</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">GSTIN</label>
                      <input name="gst_number" value={formData.gst_number} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary uppercase" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Company PAN</label>
                      <input name="pan_number" value={formData.pan_number} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary uppercase" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Industry Sector</label>
                    <input name="industry" value={formData.industry} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end border-t border-border/40 pt-4 mt-6">
                <button type="submit" disabled={onboardMutation.isPending} className="bg-primary text-primary-foreground px-8 py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2">
                  {onboardMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Provisioning...</> : 'Launch Workspace'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card/30 p-4 rounded-xl border border-border/60">
            <div className="flex bg-background/50 p-1 rounded-lg border border-border/40 w-full md:w-auto">
                {[
                    { id: 'all', label: 'All Clients', icon: Filter },
                    { id: 'active', label: 'Active Only', icon: CheckCircle2 },
                    { id: 'suspended', label: 'Suspended', icon: XCircle },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as FilterStatus)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                            activeTab === tab.id 
                            ? 'bg-primary text-primary-foreground shadow-sm' 
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                    type="text"
                    placeholder="Search company or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                />
            </div>
        </div>

       {/* Client List */}
        <div className="bg-card/30 border border-border/60 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border/40 text-[10px] uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Primary Admin</th>
                <th className="px-6 py-4">KYC Details</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading Client Base...</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No matching clients found.</td></tr>
              ) : (
                filteredClients.map((client: any) => {
                  const isSuspended = client.status === 'suspended';
                  
                  return (
                    <tr key={client.id} className={`hover:bg-muted/20 transition-colors ${isSuspended ? 'opacity-60 bg-destructive/5' : ''}`}>
                      
                      {/* Organization */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" /> {client.company_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 font-mono">{client.org_id}</div>
                      </td>

                      {/* Admin Contact */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-200">{client.admin_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Server className="w-3 h-3" /> {client.admin_email}</div>
                        <div className="text-[11px] text-zinc-500 mt-1 font-mono">{client.admin_phone}</div>
                      </td>

                      {/* Legal Info */}
                      <td className="px-6 py-4">
                        <div className="text-[10px] space-y-1 bg-background/40 p-2 rounded border border-border/40">
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground font-bold">GST:</span> 
                            <span className="font-mono text-zinc-300">{client.gst_number || 'PENDING'}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground font-bold">PAN:</span> 
                            <span className="font-mono text-zinc-300">{client.pan_number || 'PENDING'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border shadow-sm ${
                          isSuspended 
                          ? 'bg-destructive/10 text-destructive border-destructive/20' 
                          : 'bg-green-500/10 text-green-500 border-green-500/20'
                        }`}>
                          {client.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {isSuspended ? (
                          <button 
                            onClick={() => handleActivate(client.org_id, client.company_name)}
                            disabled={activateMutation.isPending}
                            className="flex items-center gap-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-green-500/20 ml-auto"
                          >
                            {activateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                            RESTORE
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleDeactivate(client.org_id, client.company_name)}
                            disabled={deactivateMutation.isPending}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-all group ml-auto"
                            title="Suspend Entire Workspace"
                          >
                            {deactivateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-5 h-5 group-hover:scale-110" />}
                          </button>
                        )}
                      </td>

                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </AdminLayout>
  );
}