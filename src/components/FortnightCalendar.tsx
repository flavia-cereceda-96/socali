import { useReducedMotion, motion } from 'framer-motion';
import { format, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DbEvent } from '@/hooks/useEvents';
import { calendarDateKey } from '@/lib/calendarDisplay';
import { cn } from '@/lib/utils';

interface Props {
  days: Date[];
  events: DbEvent[];
  today: Date;
  selectedDate: Date;
  direction: number;
  onOpenDay: (date: Date) => void;
  getBusyPlans: (date: Date) => { id: string }[];
  month?: Date;
}

export function FortnightCalendar({ days, events, today, selectedDate, direction, onOpenDay, getBusyPlans, month }: Props) {
  const reducedMotion = useReducedMotion();
  return (
    <div data-coach="calendar-grid" className="pb-5">
      <div className="grid grid-cols-7 pb-2 text-center text-[11px] font-medium text-muted-foreground">
        {days.slice(0, 7).map(day => <div key={calendarDateKey(day)}>{format(day, 'EEEEE')}</div>)}
      </div>
      <motion.div key={calendarDateKey(days[0])} initial={reducedMotion ? false : { opacity: 0, x: direction * 8 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-7 gap-y-1">
        {days.map(day => {
          const key = calendarDateKey(day);
          const selected = isSameDay(day, selectedDate);
          const hasEvents = events.some(event => key >= event.date && key <= (event.end_date || event.date));
          const busy = getBusyPlans(day).length > 0;
          return (
            <Button key={key} variant="ghost" onClick={() => onOpenDay(day)} aria-label={`View ${format(day, 'EEEE d MMMM yyyy')}`} aria-pressed={selected} className={cn('h-14 min-w-0 flex-col gap-1 rounded-lg px-0 py-1 hover:bg-secondary/40', month && day.getMonth() !== month.getMonth() && 'opacity-35')}>
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold', selected ? 'bg-secondary-foreground text-primary-foreground' : isSameDay(day, today) ? 'text-secondary-foreground ring-1 ring-primary/50' : 'text-foreground')}>{format(day, 'd')}</span>
              <span className="flex h-1.5 items-center justify-center gap-1">
                {hasEvents && <span className="h-1 w-1 rounded-full bg-secondary-foreground" />}
                {busy && <span className="h-1 w-1 rounded-full bg-muted-foreground" />}
              </span>
            </Button>
          );
        })}
      </motion.div>
    </div>
  );
}