import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/services/api';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.adminLogin(email, password);
      login(res.access_token, res.user);
      toast.success('Admin access granted');
      navigate('/');
    } catch (err: any) {
      toast.error(err.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[300px] rounded-full bg-primary/[0.05] blur-[120px]" />
      
      <div className="w-full max-w-md p-8 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">ArthaX Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">Super Admin Access Only</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Admin Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary transition-colors"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-muted/50 border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary transition-colors"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-medium rounded-lg px-4 py-2.5 mt-4 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}