import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUnreadActivityCount } from '@/hooks/useActivity';

export function homeGreeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomeHeader() {
  const navigate = useNavigate();
  const { data: unread = 0 } = useUnreadActivityCount();
  return (
    <header className="mx-auto flex max-w-md items-start justify-between px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{homeGreeting()}</p>
        <h1 className="text-[32px] font-bold leading-tight text-foreground">Your week</h1>
      </div>
      <button
        onClick={() => navigate('/requests')}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-foreground transition-colors hover:bg-border"
      >
        <Bell className="h-5 w-5" strokeWidth={2} />
        {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-muted" />}
      </button>
    </header>
  );
}
