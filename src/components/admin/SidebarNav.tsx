import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell, Building2, KeyRound, LayoutDashboard, LifeBuoy, LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface NavItem {
  name: string;
  short: string;
  path: string;
  icon: LucideIcon;
  /** Rendered as a count chip on the right of the item. */
  badgeKey?: 'openTickets' | 'activeSessions';
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', short: 'Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Client Onboarding', short: 'Clients', path: '/onboarding', icon: Building2 },
      { name: 'Helpdesk', short: 'Helpdesk', path: '/support', icon: LifeBuoy, badgeKey: 'openTickets' },
      { name: 'Notifications', short: 'Broadcasts', path: '/notifications', icon: Bell },
    ],
  },
  {
    label: 'Security',
    items: [
      { name: 'Support Access', short: 'Support Access', path: '/support-access', icon: KeyRound, badgeKey: 'activeSessions' },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

interface SidebarNavProps {
  collapsed: boolean;
  badges: Partial<Record<'openTickets' | 'activeSessions', number>>;
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed, badges, onNavigate }: SidebarNavProps) {
  const location = useLocation();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60">
              {group.label}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = location.pathname === item.path;
              const count = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;

              const link = (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                    collapsed && 'justify-center px-0',
                    active ? 'text-primary' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-xl border border-primary/25 bg-primary/[0.09]"
                    />
                  )}
                  {active && (
                    <span className="absolute -left-3 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.8)]" />
                  )}

                  <item.icon
                    className={cn(
                      'relative z-10 h-[1.05rem] w-[1.05rem] shrink-0 transition-transform duration-200',
                      !active && 'group-hover:scale-110',
                    )}
                  />

                  {!collapsed && <span className="relative z-10 truncate">{item.name}</span>}

                  {count > 0 && (
                    <span
                      className={cn(
                        'relative z-10 rounded-full border px-1.5 py-0.5 text-[10px] font-bold tabular leading-none',
                        collapsed
                          ? 'absolute -right-0.5 -top-0.5 border-background bg-primary text-primary-foreground'
                          : 'ml-auto border-primary/25 bg-primary/10 text-primary',
                      )}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </Link>
              );

              return collapsed ? (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs font-medium">
                    {item.name}
                    {count > 0 && <span className="ml-1.5 text-primary">({count})</span>}
                  </TooltipContent>
                </Tooltip>
              ) : (
                link
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
