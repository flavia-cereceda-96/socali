import { Home, CalendarDays, Users, User, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePendingFriendCount } from '@/hooks/useEvents';

const INK = '#1F1640';

type Tab = { path: string; icon: typeof Home; label: string; match: (p: string) => boolean };

const left: Tab[] = [
  { path: '/', icon: Home, label: 'Home', match: (p) => p === '/' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendar', match: (p) => p.startsWith('/calendar') },
];
const right: Tab[] = [
  {
    path: '/people?tab=friends',
    icon: Users,
    label: 'Friends',
    match: (p) => p === '/people' || p.startsWith('/person') || p.startsWith('/people/groups'),
  },
  { path: '/profile', icon: User, label: 'Profile', match: (p) => p.startsWith('/profile') },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: pendingFriends = 0 } = usePendingFriendCount();

  const renderTab = (tab: Tab) => {
    const active = tab.match(location.pathname);
    const badge = tab.label === 'Friends' ? pendingFriends : 0;
    return (
      <button
        key={tab.label}
        onClick={() => navigate(tab.path)}
        aria-label={tab.label}
        aria-current={active ? 'page' : undefined}
        className="relative flex h-11 w-14 items-center justify-center"
      >
        {active && (
          <motion.span
            layoutId="nav-pill"
            className="absolute inset-0 rounded-2xl"
            style={{ backgroundColor: '#6FEBA0' }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          />
        )}
        <span className="relative">
          <tab.icon className="h-6 w-6" strokeWidth={2} style={{ color: active ? INK : '#FFFFFF' }} />
          {badge > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <nav
      className="fixed left-3 right-3 z-50 mx-auto max-w-md"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
    >
      <div
        className="flex h-[68px] items-center justify-around rounded-3xl px-2 shadow-elevated"
        style={{ backgroundColor: INK }}
      >
        {left.map(renderTab)}
        <button
          onClick={() => navigate('/create')}
          aria-label="Create"
          className="flex h-[52px] w-[52px] items-center justify-center rounded-full transition-transform active:scale-95"
          style={{ backgroundColor: '#D4F06A' }}
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} style={{ color: INK }} />
        </button>
        {right.map(renderTab)}
      </div>
    </nav>
  );
}
