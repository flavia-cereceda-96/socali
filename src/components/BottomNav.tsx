import { Home, CalendarDays, Users, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { path: '/people', icon: Users, label: 'People' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
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
              <tab.icon className="relative z-10 h-5 w-5" />
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
