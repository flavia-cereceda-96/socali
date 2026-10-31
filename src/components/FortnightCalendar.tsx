import { useReducedMotion, motion } from 'framer-motion';
import { format, isSameDay, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DbEvent } from '@/hooks/useEvents';
import { calendarDateKey, eventWeekSpan } from '@/lib/calendarDisplay';
import { cn } from '@/lib/utils';

interface BusyPlan {
  id: string;
  friendUserId: string;
  time?: string | null;
}

interface Props {
  days: Date[];
  events: DbEvent[];
  today: Date;
  userId?: string;
  direction: number;
  onOpenDay: (date: Date) => void;
  onOpenEvent: (id: string) => void;
  getBusyPlans: (date: Date) => BusyPlan[];
  friendName: (id: string) => string;
}

export function FortnightCalendar({ days, events, today, userId, direction, onOpenDay, onOpenEvent, getBusyPlans, friendName }: Props) {
  const reducedMotion = useReducedMotion();
  const replyNeeded = (event: DbEvent) => event.created_by !== userId && event.participants.some(p => p.user_id === userId && ['pending', 'suggested'].includes(p.status));
  const chipClass = (event: DbEvent) => cn(
    'h-auto min-w-0 justify-start whitespace-normal rounded-md border px-2 py-1.5 text-left text-xs shadow-none',
    replyNeeded(event) ? 'border-accent bg-accent/20 text-accent-foreground hover:bg-accent/30' : 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'
  );
  return (
    <div className="overflow-x-auto pb-3" data-coach="calendar-grid">
      <motion.div key={calendarDateKey(days[0])} initial={reducedMotion ? false : { opacity: 0, x: direction * 12 }} animate={{ opacity: 1, x: 0 }} className="min-w-[700px]">
        <div className="grid grid-cols-7 pb-2 text-center text-xs font-semibold uppercase text-muted-foreground">
          {days.slice(0, 7).map(day => <div key={calendarDateKey(day)}>{format(day, 'EEE')}</div>)}
        </div>
        {[0, 1].map(week => {
          const weekDays = days.slice(week * 7, week * 7 + 7);
          const weekLabel = isSameDay(weekDays[0], days[0]) && today >= weekDays[0] && today < addDays(weekDays[0], 7) ? 'This week' : today >= weekDays[0] && today < addDays(weekDays[0], 7) ? 'This week' : isSameDay(weekDays[0], addDays(days[0], 7)) && today >= days[0] && today < addDays(days[0], 7) ? 'Next week' : `${format(weekDays[0], 'd MMM')} – ${format(weekDays[6], 'd MMM')}`;
          const spanning = events.filter(event => event.end_date && event.end_date > event.date && eventWeekSpan(event.date, event.end_date, weekDays));
          return (
            <section key={week} className="mb-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{weekLabel}</h3>
              <div className="grid grid-cols-7 gap-px border-t border-border bg-border">
                {weekDays.map(day => (
                  <Button key={calendarDateKey(day)} variant="ghost" onClick={() => onOpenDay(day)} aria-label={`View ${format(day, 'EEEE d MMMM yyyy')}`} className="h-11 rounded-none bg-card text-foreground hover:bg-muted">
                    <span className={cn('flex h-7 min-w-7 items-center justify-center rounded-full text-sm', isSameDay(day, today) && 'bg-secondary-foreground font-bold text-primary-foreground')}>{format(day, 'd')}</span>
                    {day.getDate() === 1 && <span className="text-[10px] text-muted-foreground">{format(day, 'MMM')}</span>}
                  </Button>
                ))}
              </div>
              {spanning.length > 0 && (
                <div className="grid grid-cols-7 gap-1 bg-card py-1">
                  {spanning.map(event => {
                    const span = eventWeekSpan(event.date, event.end_date || event.date, weekDays);
                    if (!span) return null;
                    return <Button key={event.id} variant="secondary" className={chipClass(event)} style={{ gridColumn: `${span.column} / span ${span.length}` }} onClick={() => onOpenEvent(event.id)}><span className="truncate">{event.emoji} {event.title}</span>{replyNeeded(event) && <span className="shrink-0 text-[10px]">Reply</span>}</Button>;
                  })}
                </div>
              )}
              <div className="grid grid-cols-7 gap-px border-b border-border bg-border">
                {weekDays.map(day => {
                  const plans = events.filter(event => event.date === calendarDateKey(day) && (!event.end_date || event.end_date === event.date)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                  const busy = getBusyPlans(day);
                  return (
                    <div key={calendarDateKey(day)} className="flex min-h-[170px] min-w-0 flex-col gap-1.5 bg-card p-1">
                      {plans.map(event => <Button key={event.id} variant="secondary" className={chipClass(event)} onClick={() => onOpenEvent(event.id)} title={event.title}><span className="block w-full min-w-0"><span className="block break-words font-semibold">{event.emoji} {event.title}</span><span className="mt-1 block text-[10px] font-normal">{event.time?.slice(0, 5) || 'No set time'}{replyNeeded(event) && <span className="ml-1 font-semibold">· Reply</span>}</span></span></Button>)}
                      {busy.map(plan => <Button key={`${plan.id}-${plan.friendUserId}`} variant="ghost" onClick={() => onOpenDay(day)} className="h-auto justify-start whitespace-normal rounded-md bg-muted px-1.5 py-1 text-left text-[10px] text-muted-foreground"><span className="min-w-0 break-words">{friendName(plan.friendUserId)} · {plan.time?.slice(0, 5) || 'Busy'}</span></Button>)}
                      <Button variant="ghost" size="sm" aria-label={`View plans for ${format(day, 'd MMMM')}`} onClick={() => onOpenDay(day)} className="mt-auto h-7 text-xs text-muted-foreground">{plans.length || spanning.some(event => eventWeekSpan(event.date, event.end_date || event.date, [day])) ? 'View day' : '＋'}</Button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </motion.div>
    </div>
  );
}