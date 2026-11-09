import { useNavigate } from 'react-router-dom';
import type { DbEventWithCreator } from '@/hooks/useEvents';
import { useWeekStart, weekStartIndex } from '@/hooks/useWeekStart';
import { calendarDateKey } from '@/lib/calendarDisplay';
import { avatarColorVar } from '@/lib/avatarRules';
import { cn } from '@/lib/utils';

export function currentWeekDays(today: Date, weekStartsOn: 0 | 1): Date[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  start.setDate(start.getDate() - ((start.getDay() - weekStartsOn + 7) % 7));
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

type Face = { id: string; avatarUrl?: string | null };

export function WeekStrip({ events, userId }: { events: DbEventWithCreator[]; userId: string | null }) {
  const navigate = useNavigate();
  const wsIdx = weekStartIndex(useWeekStart()) as 0 | 1;
  const today = new Date();
  const todayKey = calendarDateKey(today);
  const days = currentWeekDays(today, wsIdx);

  const facesFor = (key: string): Face[] => {
    const out: Face[] = [];
    const seen = new Set<string>();
    events
      .filter(e => e.date === key)
      .filter(e => e.participants.find(p => p.user_id === userId)?.status !== 'declined')
      .forEach(e => {
        const people: Face[] = [
          ...(e.created_by !== userId ? [{ id: e.created_by, avatarUrl: e.creator_profile?.avatar_url }] : []),
          ...e.participants.filter(p => p.user_id !== userId && p.status !== 'declined').map(p => ({ id: p.user_id, avatarUrl: p.profile?.avatar_url })),
        ];
        people.forEach(f => { if (!seen.has(f.id)) { seen.add(f.id); out.push(f); } });
      });
    return out.slice(0, 2);
  };

  const hasPlans = (key: string) => events.some(e => e.date === key);

  return (
    <div className="mb-6 grid grid-cols-7 gap-1.5">
      {days.map(d => {
        const key = calendarDateKey(d);
        const isToday = key === todayKey;
        const faces = facesFor(key);
        return (
          <button
            key={key}
            onClick={() => navigate(`/calendar?date=${key}`)}
            aria-label={d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            className={cn(
              'flex h-[70px] flex-col items-center justify-center gap-0.5 rounded-[14px]',
              isToday ? 'bg-foreground text-background' : 'bg-muted text-foreground',
            )}
          >
            <span className={cn('text-[11px] font-semibold uppercase', !isToday && 'text-muted-foreground')}>
              {d.toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
            <span className="text-[17px] font-bold leading-none">{d.getDate()}</span>
            <span className="flex h-2.5 items-center">
              {faces.map((f, i) => (
                <span
                  key={f.id}
                  className="h-2.5 w-2.5 overflow-hidden rounded-full"
                  style={{ marginLeft: i ? -3 : 0, backgroundColor: `hsl(var(${avatarColorVar(f.id)}))` }}
                >
                  {f.avatarUrl && <img src={f.avatarUrl} alt="" className="h-full w-full object-cover" />}
                </span>
              ))}
              {faces.length === 0 && hasPlans(key) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
