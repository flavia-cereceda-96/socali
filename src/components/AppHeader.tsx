import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUnreadActivityCount } from '@/hooks/useActivity';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  title?: string;
  className?: string;
}

export function AppHeader({ title, className }: AppHeaderProps) {
  const navigate = useNavigate();
  const { data: unread = 0 } = useUnreadActivityCount();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex items-center justify-between bg-background/80 backdrop-blur-xl px-4 pt-3 pb-2',
        className
      )}
    >
      <h1 className="text-lg font-bold text-foreground truncate">{title ?? 'SyncCircle'}</h1>
      <button
        aria-label="Notifications"
        onClick={() => navigate('/requests')}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted transition-colors"
      >
        <Bell className="h-[22px] w-[22px]" strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF3040] px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </header>
  );
}