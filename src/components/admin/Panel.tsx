import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PanelProps {
  title?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Drop the body padding — for tables and lists that manage their own. */
  flush?: boolean;
}

export function Panel({ title, icon: Icon, actions, children, className, bodyClassName, flush }: PanelProps) {
  return (
    <section className={cn('panel overflow-hidden', className)}>
      {(title || actions) && (
        <header className="panel-header">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-primary" />}
            <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(flush ? '' : 'p-5', bodyClassName)}>{children}</div>
    </section>
  );
}
