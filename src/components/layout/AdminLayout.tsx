import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronsLeft, ChevronsRight, LogOut, Menu, PanelsTopLeft, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { adminAnalyticsApi, authApi, supportAccessApi } from '@/services/api';
import { qk } from '@/lib/queryKeys';
import { initials } from '@/lib/format';
import { isLiveGrant } from '@/lib/grants';
import { cn } from '@/lib/utils';
import { ALL_NAV_ITEMS, SidebarNav } from '@/components/admin/SidebarNav';
import { SyncIndicator } from '@/components/admin/SyncIndicator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const COLLAPSE_KEY = 'arthax_admin_sidebar_collapsed';

/** staging-api.arthax.ai -> Staging. Cosmetic, read from the build env. */
function environmentLabel(): { label: string; tone: string } {
  const url = (import.meta.env.VITE_API_URL as string) || '';
  if (/localhost|127\.0\.0\.1/.test(url)) return { label: 'Local', tone: 'text-blue-400 border-blue-500/25 bg-blue-500/10' };
  if (/staging|dev/.test(url)) return { label: 'Staging', tone: 'text-amber-400 border-amber-500/25 bg-amber-500/10' };
  return { label: 'Production', tone: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10' };
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Both of these read the SAME cache the Dashboard and Support Access pages
  // use, so mounting the shell costs no extra request while that data is fresh
  // — and the counters move the instant either page updates its cache.
  const { data: dashboard } = useQuery({
    queryKey: qk.dashboard,
    queryFn: adminAnalyticsApi.getDashboard,
  });

  const { data: sessions } = useQuery({
    queryKey: qk.supportSessions,
    queryFn: () => supportAccessApi.listSessions({ limit: 50 }),
  });

  const badges = useMemo(() => {
    const byStatus = dashboard?.helpdesk?.by_status ?? {};
    const openTickets =
      (byStatus['open'] || 0) + (byStatus['in_progress'] || 0) + (byStatus['reopened'] || 0);
    const activeSessions = (sessions ?? []).filter(isLiveGrant).length;
    return { openTickets, activeSessions };
  }, [dashboard, sessions]);

  const current = ALL_NAV_ITEMS.find((i) => i.path === location.pathname);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // The local session is what matters here; a failed server call must not
      // strand the admin in a portal they have already left.
    }
    logout();
    toast.success('Logged out securely');
    navigate('/login');
  };

  const env = environmentLabel();

  const renderBrand = (collapsed: boolean) => (
    <div className={cn('flex h-16 items-center gap-2.5 border-b border-border/50 px-5', collapsed && 'justify-center px-0')}>
      <div className="relative shrink-0">
        <div className="absolute inset-0 rounded-lg bg-primary/30 blur-md" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
          <ShieldCheck className="h-4 w-4 text-primary" />
        </div>
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-none">
          <p className="text-[15px] font-extrabold tracking-tight text-foreground">
            Artha<span className="text-primary">X</span>
          </p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Super Admin
          </p>
        </div>
      )}
    </div>
  );

  const renderUserCard = (collapsed: boolean) => (
    <div className="border-t border-border/50 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-2 text-left transition-colors hover:border-border/60 hover:bg-muted/40',
              collapsed && 'justify-center px-0',
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-lime-300 text-[11px] font-extrabold text-primary-foreground">
              {initials(user?.full_name)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">{user?.full_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-60">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Signed in as
            <p className="mt-0.5 text-sm font-semibold text-foreground">{user?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
          >
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const sidebarBody = (isCollapsed: boolean, onNavigate?: () => void) => (
    <>
      {renderBrand(isCollapsed)}
      <SidebarNav collapsed={isCollapsed} badges={badges} onNavigate={onNavigate} />
      {renderUserCard(isCollapsed)}
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'relative z-20 hidden shrink-0 flex-col border-r border-border/50 lg:flex',
          'bg-[linear-gradient(180deg,hsl(0_0%_8%),hsl(0_0%_6%))]',
          'transition-[width] duration-300 ease-out',
          collapsed ? 'w-[76px]' : 'w-[264px]',
        )}
      >
        {sidebarBody(collapsed)}

        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-20 z-30 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary lg:flex"
        >
          {collapsed ? <ChevronsRight className="h-3 w-3" /> : <ChevronsLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-[264px] border-border/50 bg-[linear-gradient(180deg,hsl(0_0%_8%),hsl(0_0%_6%))] p-0"
        >
          <div className="flex h-full flex-col">
            {sidebarBody(false, () => setMobileOpen(false))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
              <PanelsTopLeft className="h-4 w-4 shrink-0 text-muted-foreground/70" />
              <span className="hidden text-muted-foreground sm:inline">Admin Portal</span>
              <span className="hidden text-muted-foreground/40 sm:inline">/</span>
              <span className="truncate font-semibold text-foreground">
                {current?.name ?? 'Overview'}
              </span>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span
              className={cn(
                'hidden rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] sm:inline-flex',
                env.tone,
              )}
            >
              {env.label}
            </span>
            <SyncIndicator />
          </div>
        </header>

        <main className="custom-scrollbar relative flex-1 overflow-y-auto">
          {/* Ambient wash behind the page content. */}
          <div className="pointer-events-none absolute inset-0 mesh-glow" />
          <div className="relative mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
