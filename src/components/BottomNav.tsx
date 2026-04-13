import { Home, CalendarDays, Users, Plus, Inbox } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { usePendingRequestCount } from '@/hooks/useEvents';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { path: '/people', icon: Users, label: 'People' },
  { path: '/requests', icon: Inbox, label: 'Requests' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: pendingCount = 0 } = usePendingRequestCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          const showBadge = tab.path === '/requests' && pendingCount > 0;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-xs transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {active && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10">
                <tab.icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              <span className="relative z-10 font-medium">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => navigate('/create')}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}