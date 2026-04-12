import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { adminClientsApi } from '@/services/api';
import { toast } from 'sonner';
import { Building2, Plus, Server, Briefcase, FileText } from 'lucide-react';

export default function Onboarding() {
  const qc = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [formData, setFormData] = useState({
    company_name: '', admin_name: '', admin_email: '', admin_phone: '',
    business_type: '', gst_number: '', pan_number: '', industry: '', temporary_password: ''
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ['onboardedClients'],
    queryFn: adminClientsApi.list,
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onboardMutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-end bg-card/50 p-6 rounded-2xl border border-border/60">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" /> Client Provisioning
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Create and track new ArthaX workspaces and their legal details.</p>
          </div>
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" /> {isFormOpen ? 'Close Form' : 'Provision New Client'}
          </button>
        </div>

        {/* Slide-down Form */}
        {isFormOpen && (
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-xl animate-fade-in">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2"><Server className="w-5 h-5 text-primary" /> Setup New Workspace</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                
                {/* Org & Admin Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground border-b border-border/40 pb-2 mb-4 uppercase tracking-wider">Contact & Org Details</h3>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Company Name *</label>
                    <input required name="company_name" value={formData.company_name} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Admin Name *</label>
                      <input required name="admin_name" value={formData.admin_name} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Phone</label>
                      <input name="admin_phone" value={formData.admin_phone} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Admin Email (Used for Login) *</label>
                    <input required type="email" name="admin_email" value={formData.admin_email} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Temporary Password (Leave blank for 'Admin@123')</label>
                    <input name="temporary_password" value={formData.temporary_password} onChange={handleInputChange} placeholder="Admin@123" className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground/30" />
                  </div>
                </div>

                {/* Legal Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-muted-foreground border-b border-border/40 pb-2 mb-4 uppercase tracking-wider flex items-center gap-2"><FileText className="w-4 h-4" /> Legal Details (India)</h3>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Business Type</label>
                    <select name="business_type" value={formData.business_type} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary">
                      <option value="">Select Type...</option>
                      <option value="Private Limited">Private Limited</option>
                      <option value="LLP">LLP</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Sole Proprietorship">Sole Proprietorship</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">GST Number</label>
                      <input name="gst_number" value={formData.gst_number} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary uppercase" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">PAN Number</label>
                      <input name="pan_number" value={formData.pan_number} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary uppercase" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Industry</label>
                    <input name="industry" value={formData.industry} onChange={handleInputChange} className="w-full mt-1 bg-background border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary" />
                  </div>
                </div>

              </div>
              
              <div className="flex justify-end border-t border-border/40 pt-4 mt-6">
                <button type="submit" disabled={onboardMutation.isPending} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {onboardMutation.isPending ? 'Provisioning...' : 'Provision Workspace & Admin'}
                </button>
              </div>
            </form>
          </div>
        )}

       {/* Client List */}
        <div className="bg-card/30 border border-border/60 rounded-2xl overflow-hidden shadow-sm mt-8">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border/40 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Company Details</th>
                <th className="px-6 py-4 font-medium">Admin Contact</th>
                <th className="px-6 py-4 font-medium">Legal / Govt Info</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Provisioned On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading clients...</td></tr>
              ) : clients?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No clients provisioned yet.</td></tr>
              ) : (
                clients?.map((client: any) => (
                  <tr key={client.id} className="hover:bg-muted/20 transition-colors">
                    
                    {/* Company */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary" /> {client.company_name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Org ID: {client.org_id}</div>
                      {(client.industry || client.business_type) && (
                        <div className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-sm inline-block mt-2 border border-border">
                          {client.business_type} {client.industry && `• ${client.industry}`}
                        </div>
                      )}
                    </td>

                    {/* Admin Contact */}
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-300">{client.admin_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{client.admin_email}</div>
                      <div className="text-xs text-zinc-400 mt-0.5 font-mono">{client.admin_phone || 'No phone provided'}</div>
                    </td>

                    {/* Legal Info */}
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1.5 bg-background/50 p-2 rounded-md border border-border/50 inline-block">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-8">GST:</span> 
                          <span className="font-mono text-zinc-200">{client.gst_number || 'N/A'}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground w-8">PAN:</span> 
                          <span className="font-mono text-zinc-200">{client.pan_number || 'N/A'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        {client.status}
                      </span>
                    </td>

                    {/* Dates */}
                    <td className="px-6 py-4 text-right text-muted-foreground text-xs font-mono">
                      <div>{new Date(client.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] mt-0.5">{new Date(client.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </AdminLayout>
  );
}