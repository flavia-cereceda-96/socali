import { Home, CalendarDays, Users, Plus, Bell, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { usePendingFriendCount } from '@/hooks/useEvents';
import { useUnreadActivityCount } from '@/hooks/useActivity';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { path: '/people', icon: Users, label: 'People' },
  { path: '/requests', icon: Bell, label: 'Activity' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: unreadActivity = 0 } = useUnreadActivityCount();
  const { data: pendingFriends = 0 } = usePendingFriendCount();

  const getBadgeCount = (path: string) => {
    if (path === '/requests') return unreadActivity;
    if (path === '/people') return pendingFriends;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          const badgeCount = getBadgeCount(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs transition-colors',
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
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="relative z-10 font-medium">{tab.label}</span>
            </button>
          );
        })}
        <button
          data-coach="home-fab"
          onClick={() => navigate('/create')}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </nav>
  );
}
