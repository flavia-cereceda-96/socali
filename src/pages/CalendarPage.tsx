import { useState, useMemo } from 'react';
import { events, friends, Friend } from '@/data/mockData';
import { EventCard } from '@/components/EventCard';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FRIEND_COLORS = [
  'bg-blue-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-cyan-500',
];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isDateInRange(date: Date, start: Date, end?: Date) {
  if (!end) return isSameDay(date, start);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d >= s && d <= e;
}

function getFriendBusyDays(friendId: string): Date[] {
  const busyDays: Date[] = [];
  events.forEach(event => {
    const isParticipant = event.participants.some(p => p.friend.id === friendId);
    if (!isParticipant) return;
    if (event.endDate) {
      const current = new Date(event.date);
      while (current <= event.endDate) {
        busyDays.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else {
      busyDays.push(new Date(event.date));
    }
  });
  return busyDays;
}

const CalendarPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [showFriendPanel, setShowFriendPanel] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const friendBusyMap = useMemo(() => {
    const map: Record<string, Date[]> = {};
    selectedFriends.forEach(fId => {
      map[fId] = getFriendBusyDays(fId);
    });
    return map;
  }, [selectedFriends]);

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const shift = (dir: number) => {
    setCurrentMonth(new Date(year, month + dir, 1));
    setSelectedDate(null);
  };

  const dayEvents = selectedDate
    ? events.filter(e => isDateInRange(selectedDate, e.date, e.endDate))
    : [];

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-4 pt-12">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center justify-between"
        >
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <button
            onClick={() => setShowFriendPanel(!showFriendPanel)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              showFriendPanel || selectedFriends.length > 0
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="h-4 w-4" />
            {selectedFriends.length > 0 ? selectedFriends.length : 'Availability'}
          </button>
        </motion.div>

        {/* Friend Selector Panel */}
        <AnimatePresence>
          {showFriendPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="rounded-2xl bg-card p-3 shadow-card">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Select friends to see their busy days</p>
                <div className="flex flex-wrap gap-2">
                  {friends.map((friend, idx) => {
                    const isActive = selectedFriends.includes(friend.id);
                    return (
                      <button
                        key={friend.id}
                        onClick={() => toggleFriend(friend.id)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                        )}
                      >
                        <div className="h-5 w-5 rounded-full overflow-hidden">
                          {friend.avatar ? (
                            <img src={friend.avatar} alt={friend.name} className="h-full w-full object-cover" />
                          ) : (
                            <span>{friend.emoji}</span>
                          )}
                        </div>
                        {friend.name}
                        {isActive && (
                          <span className={cn('h-2 w-2 rounded-full', FRIEND_COLORS[idx % FRIEND_COLORS.length])} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            const hasEvent = events.some(e => isDateInRange(date, e.date, e.endDate));
            const isSelected = selectedDate && isSameDay(date, selectedDate);

            // Get which selected friends are busy on this day
            const busyFriends = selectedFriends.filter(fId =>
              friendBusyMap[fId]?.some(bd => isSameDay(bd, date))
            );

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
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {hasEvent && !isSelected && (
                    <span className="h-1 w-1 rounded-full bg-primary" />
                  )}
                  {busyFriends.map(fId => {
                    const idx = friends.findIndex(f => f.id === fId);
                    return (
                      <span
                        key={fId}
                        className={cn('h-1 w-1 rounded-full', FRIEND_COLORS[idx % FRIEND_COLORS.length])}
                      />
                    );
                  })}
                </div>
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

              {/* Friend busy indicators */}
              {selectedFriends.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedFriends.map(fId => {
                    const friend = friends.find(f => f.id === fId)!;
                    const idx = friends.findIndex(f => f.id === fId);
                    const isBusy = friendBusyMap[fId]?.some(bd => isSameDay(bd, selectedDate!));
                    return (
                      <span
                        key={fId}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          isBusy ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', FRIEND_COLORS[idx % FRIEND_COLORS.length])} />
                        {friend.name}: {isBusy ? 'Busy' : 'Free'}
                      </span>
                    );
                  })}
                </div>
              )}

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
