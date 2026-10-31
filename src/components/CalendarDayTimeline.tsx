import { format } from 'date-fns';
import { MapPin, Plus, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { DbEvent } from '@/hooks/useEvents';

interface BusyPlan {
  id: string;
  friendUserId: string;
  title: string;
  time?: string | null;
  end_time?: string | null;
}
interface Props {
  date: Date;
  events: DbEvent[];
  busyPlans: BusyPlan[];
  userId?: string;
  friendName: (id: string) => string;
  onOpenEvent: (id: string) => void;
  onCreate: () => void;
}

export function CalendarDayTimeline({ date, events, busyPlans, userId, friendName, onOpenEvent, onCreate }: Props) {
  const allDay = events.filter(event => !event.time);
  const timed = events.filter(event => event.time);
  const entries = [
    ...timed.map(event => ({ key: event.id, time: event.time || '', event, busy: null })),
    ...busyPlans.map(busy => ({ key: `${busy.id}-${busy.friendUserId}`, time: busy.time || '', event: null, busy })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const eventCard = (event: DbEvent) => {
    const replyNeeded = event.created_by !== userId && event.participants.some(p => p.user_id === userId && ['pending', 'suggested'].includes(p.status));
    return (
      <Button variant="ghost" onClick={() => onOpenEvent(event.id)} className="h-auto w-full min-w-0 justify-start whitespace-normal rounded-lg border border-border bg-card p-3.5 text-left hover:bg-secondary/30">
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex items-start gap-2"><span className="text-xl">{event.emoji}</span><span className="min-w-0 break-words text-sm font-semibold text-foreground">{event.title}</span></span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground">
            {event.time && <span>{event.time.slice(0, 5)}{event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ''}</span>}
            {event.end_date && event.end_date !== event.date && <span>Through {format(new Date(`${event.end_date}T00:00:00`), 'MMM d')}</span>}
            {event.location && <span className="flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3" /><span className="break-words">{event.location}</span></span>}
          </span>
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex -space-x-1.5">
              {event.participants.filter(p => p.status !== 'declined').slice(0, 4).map(p => <UserAvatar key={p.user_id} avatarUrl={p.profile?.avatar_url} username={p.profile?.username} size="sm" />)}
            </span>
            {replyNeeded && <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold text-accent-foreground">Reply needed</span>}
          </span>
        </span>
      </Button>
    );
  };

  return (
    <section className="border-t border-border pt-5" aria-label="Daily schedule">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold text-foreground">{format(date, 'EEEE')}</h2><p className="mt-0.5 text-xs text-muted-foreground">{format(date, 'd MMMM yyyy')} · {events.length} {events.length === 1 ? 'plan' : 'plans'}</p></div>
        <Button variant="secondary" size="icon" className="shrink-0 rounded-full" aria-label="Add plan on selected date" onClick={onCreate}><Plus /></Button>
      </div>
      {events.length === 0 && busyPlans.length === 0 ? <div className="flex flex-col items-center py-9 text-center"><CalendarDays className="mb-3 h-7 w-7 text-primary" /><p className="text-sm font-semibold text-foreground">No plans yet</p><Button variant="link" onClick={onCreate} className="mt-2 gap-1 text-secondary-foreground"><Plus /> Plan something</Button></div> : (
        <div className="space-y-3">
          {allDay.length > 0 && <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3"><span className="pt-4 text-[11px] text-muted-foreground">All day</span><div className="space-y-2">{allDay.map(event => <div key={event.id}>{eventCard(event)}</div>)}</div></div>}
          {entries.map(entry => <div key={entry.key} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3"><span className="pt-4 text-[11px] font-medium text-muted-foreground">{entry.time.slice(0, 5) || 'Anytime'}</span><div className="relative min-w-0 border-l border-border pl-3"><span className="absolute -left-1 top-5 h-2 w-2 rounded-full bg-primary" />{entry.event ? eventCard(entry.event) : entry.busy && <div className="rounded-lg bg-muted p-3.5"><p className="break-words text-xs font-semibold text-muted-foreground">{friendName(entry.busy.friendUserId)} · Busy</p><p className="mt-1 break-words text-xs text-muted-foreground">{entry.busy.title}{entry.busy.end_time ? ` · until ${entry.busy.end_time.slice(0, 5)}` : ''}</p></div>}</div></div>)}
        </div>
      )}
    </section>
  );
}