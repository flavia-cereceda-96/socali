import { useNavigate } from 'react-router-dom';
import { personName } from '@/lib/personName';
import { useFriends, type DbEventWithCreator } from '@/hooks/useEvents';
import { useWeekStart, weekStartIndex } from '@/hooks/useWeekStart';
import { calendarDateKey } from '@/lib/calendarDisplay';
import { UserAvatar } from '@/components/UserAvatar';
import { currentWeekDays } from './WeekStrip';
import { cn } from '@/lib/utils';

const MAX = 5;

export function YourPeople({ events, userId }: { events: DbEventWithCreator[]; userId: string | null }) {
  const navigate = useNavigate();
  const { data: friends = [] } = useFriends();
  const wsIdx = weekStartIndex(useWeekStart()) as 0 | 1;
  const days = currentWeekDays(new Date(), wsIdx);
  const keys = days.map(calendarDateKey);
  const todayKey = calendarDateKey(new Date());
  const friendMap = new Map(friends.map((f: any) => [f.user_id, f]));

  const tally = new Map<string, { count: number; days: Set<string> }>();
  events.forEach(e => {
    if (!e.date || !keys.includes(e.date)) return;
    const creatorGoing = ((e as any).creator_rsvp || 'confirmed') === 'confirmed';
    const meGoing = e.created_by === userId ? creatorGoing : e.participants.find(p => p.user_id === userId)?.status === 'confirmed';
    if (!meGoing) return;
    const going = [
      ...(e.created_by !== userId && creatorGoing ? [e.created_by] : []),
      ...e.participants.filter(p => p.user_id !== userId && p.status === 'confirmed').map(p => p.user_id),
    ];
    going.forEach(id => {
      if (!friendMap.has(id)) return;
      const t = tally.get(id) ?? { count: 0, days: new Set() };
      t.count += 1; t.days.add(e.date);
      tally.set(id, t);
    });
  });

  const ranked = [...tally.entries()].sort((a, b) => b[1].count - a[1].count);
  if (ranked.length === 0) return null;
  const shown = ranked.slice(0, MAX);
  const extra = ranked.length - shown.length;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your people this week</h2>
        <button onClick={() => navigate('/people?tab=friends')} className="text-sm font-semibold text-primary">See all</button>
      </div>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
        {shown.map(([id, t]) => {
          const f: any = friendMap.get(id);
          const name = (f?.display_name || personName(f, 'Friend')).split(' ')[0];
          const dayKeys = keys.filter(k => t.days.has(k));
          const label = dayKeys.map(k => new Date(k + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()).join(' · ');
          const hasToday = dayKeys.includes(todayKey);
          return (
            <button key={id} onClick={() => navigate(`/person/${id}`)} className="flex w-[72px] shrink-0 flex-col items-center gap-1">
              <span className="rounded-full p-[3px] ring-2 ring-accent" style={{ boxShadow: 'inset 0 0 0 3px hsl(var(--background))' }}>
                <UserAvatar avatarUrl={f?.avatar_url} username={f?.username} userId={id} className="h-[54px] w-[54px]" />
              </span>
              <span className="max-w-full truncate text-[13px] font-medium text-foreground">{name}</span>
              <span className={cn('max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-bold', hasToday ? 'bg-foreground text-background' : 'bg-muted text-foreground')}>
                {label}
              </span>
            </button>
          );
        })}
        {extra > 0 && (
          <button onClick={() => navigate('/people?tab=friends')} className="flex w-[72px] shrink-0 flex-col items-center gap-1">
            <span className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">+{extra}</span>
            <span className="text-[13px] text-muted-foreground">more</span>
          </button>
        )}
      </div>
    </section>
  );
}
