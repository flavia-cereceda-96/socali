import { useState } from 'react';
import { events } from '@/data/mockData';
import { EventCard } from '@/components/EventCard';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const CalendarPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const eventDates = events.map(e => e.date);

  const shift = (dir: number) => {
    setCurrentMonth(new Date(year, month + dir, 1));
    setSelectedDate(null);
  };

  const dayEvents = selectedDate ? events.filter(e => isSameDay(e.date, selectedDate)) : [];

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-2xl font-bold text-foreground"
        >
          Calendar
        </motion.h1>

        {/* Month Header */}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="font-semibold text-foreground">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => shift(1)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
          {DAYS.map(d => <div key={d}>{d}</div>)}
        </div>

        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-7 gap-1"
        >
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const date = new Date(year, month, i + 1);
            const isToday = isSameDay(date, today);
            const hasEvent = eventDates.some(ed => isSameDay(ed, date));
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'relative flex h-10 w-full flex-col items-center justify-center rounded-xl text-sm transition-all',
                  isSelected ? 'bg-primary text-primary-foreground font-bold' :
                  isToday ? 'bg-primary/10 text-primary font-semibold' :
                  'hover:bg-secondary text-foreground'
                )}
              >
                {i + 1}
                {hasEvent && !isSelected && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </motion.div>

        {/* Selected Day Events */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 overflow-hidden"
            >
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
              {dayEvents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {dayEvents.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No plans yet — a perfect day to plan something! ✨</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CalendarPage;
