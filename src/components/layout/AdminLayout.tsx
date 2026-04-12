import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, LayoutDashboard, LifeBuoy, LogOut, Settings, ShieldAlert } from 'lucide-react';
import { authApi } from '@/services/api';
import { toast } from 'sonner';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) { } // Ignore errors on logout
    logout();
    toast.success("Logged out securely");
    navigate('/login');
  };

  const links = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Client Onboarding', path: '/onboarding', icon: <Building2 className="w-5 h-5" /> }, 
    { name: 'Helpdesk', path: '/support', icon: <LifeBuoy className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-border/40 bg-card/30 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border/40">
          <span className="font-extrabold text-xl text-gradient-primary flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            ArthaX Admin
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                location.pathname === l.path 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              {l.icon} {l.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border/40">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.full_name?.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.full_name}</span>
              <span className="text-xs text-muted-foreground">Super Admin</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium text-red-400 hover:bg-red-400/10"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border/40 bg-background/50 backdrop-blur-md flex items-center px-8 justify-between shrink-0">
          <h2 className="text-sm font-medium text-muted-foreground">Admin Portal Overview</h2>
        </header>
        <main className="flex-1 overflow-auto p-8 custom-scrollbar relative">
          {/* Background Glow matching landing page */}
          <div className="pointer-events-none absolute top-0 left-1/4 h-[400px] w-[500px] rounded-full bg-primary/[0.03] blur-[120px]" />
          {children}
        </main>
      </div>
    </div>
  );
}