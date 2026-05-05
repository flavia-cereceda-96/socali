import { Home, CalendarDays, Users, UsersRound, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { usePendingFriendCount } from '@/hooks/useEvents';

const tabs = [
  { path: '/', icon: Home, label: 'Home', match: (p: string, _s: string) => p === '/' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendar', match: (p: string) => p.startsWith('/calendar') },
  {
    path: '/people?tab=friends',
    icon: Users,
    label: 'Friends',
    match: (p: string, s: string) =>
      (p === '/people' || p.startsWith('/person')) && !s.includes('tab=groups'),
  },
  {
    path: '/people?tab=groups',
    icon: UsersRound,
    label: 'Groups',
    match: (p: string, s: string) =>
      p.startsWith('/people/groups') || (p === '/people' && s.includes('tab=groups')),
  },
  { path: '/profile', icon: User, label: 'Profile', match: (p: string) => p.startsWith('/profile') },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: pendingFriends = 0 } = usePendingFriendCount();

  const getBadgeCount = (path: string) => {
    if (path.startsWith('/people?tab=friends')) return pendingFriends;
    return 0;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pt-1.5 pb-1.5">
        {tabs.map((tab) => {
          const active = tab.match(location.pathname, location.search);
          const badgeCount = getBadgeCount(tab.path);
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] transition-colors',
                active ? 'text-[#5B4FD9]' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <tab.icon
                  className="h-[26px] w-[26px]"
                  strokeWidth={active ? 2 : 1.75}
                  fill={active ? 'currentColor' : 'none'}
                />
                {badgeCount > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#FF3040] px-1 text-[10px] font-bold leading-none text-white">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className={cn('font-medium', active && 'text-[#5B4FD9]')}>{tab.label}</span>
              {active && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -top-[7px] h-[2px] w-8 rounded-full bg-[#5B4FD9]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
